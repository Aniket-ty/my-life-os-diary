import re
import os
import json
from typing import Dict, Any, List, Optional
import httpx

from assistant.inline_knowledge import FOOD_DATABASE, EXERCISE_DATABASE, FITNESS_QA_TOPICS

SYSTEM_PROMPT = """You are a personal health and fitness assistant inside "My Life OS" app.
Your job:
1. Answer questions about food — give calories, protein, carbs, fat per standard serving
2. Answer questions about exercises — muscles worked, proper form, suggested sets/reps, calories burned
3. Help the user track their daily nutrition and workouts
4. Be encouraging, concise, and specific

IMPORTANT — Action blocks:
When the user wants to LOG food, respond with this exact JSON block at the END of your message:
ACTION:{"type":"log_food","data":{"foodName":"...","calories":0,"proteinG":0,"carbsG":0,"fatG":0,"mealType":"lunch","quantity":"..."}}

When the user wants to ADD a workout, respond with this exact JSON block at the END:
ACTION:{"type":"add_workout","data":{"workoutName":"...","exercises":[{"exerciseName":"...","sets":3,"reps":"10"}]}}

Only include an ACTION block when the user explicitly says to log, add, or track something.
Keep responses under 200 words unless explaining a detailed topic."""

def _extract_quantity_and_weight(text: str, default_unit_g: float) -> tuple[float, str]:
    """Extract gram weight or unit multiplier from phrases like '200g', '3 eggs', '1 scoop'."""
    # Check for direct grams: e.g. 200g, 150 grams
    g_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:g|gm|grams?)\b", text, re.IGNORECASE)
    if g_match:
        weight = float(g_match.group(1))
        return weight, f"{int(weight) if weight.is_integer() else weight}g"

    # Check for unit counts: e.g. 2 scoops, 3 eggs, 4 slices, 1 cup
    count_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:pieces?|slices?|scoops?|eggs?|rotis?|cups?|bowls?|glasses?|tablespoons?|tbsp)?\b", text, re.IGNORECASE)
    if count_match:
        try:
            count = float(count_match.group(1))
            if 0 < count <= 50:
                weight = count * default_unit_g
                return weight, f"{int(count) if count.is_integer() else count} serving ({int(weight)}g)"
        except Exception:
            pass

    return default_unit_g, f"1 serving ({int(default_unit_g)}g)"

def _match_food(text: str) -> Optional[tuple[str, Dict[str, Any]]]:
    """Search for food items in the database by word boundary overlap."""
    lower = text.lower()
    # Sort by key length descending so 'chicken breast' matches before 'chicken'
    sorted_foods = sorted(FOOD_DATABASE.items(), key=lambda x: len(x[0]), reverse=True)
    for food_name, info in sorted_foods:
        pattern = rf"\b{re.escape(food_name)}\b"
        if re.search(pattern, lower):
            return food_name, info
    return None

def _detect_meal_type(text: str) -> str:
    lower = text.lower()
    if "breakfast" in lower:
        return "breakfast"
    if "lunch" in lower:
        return "lunch"
    if "dinner" in lower:
        return "dinner"
    if "snack" in lower:
        return "snack"
    return "lunch"

def try_inline_food_logic(user_message: str) -> Optional[Dict[str, Any]]:
    lower = user_message.lower()
    is_log_intent = bool(re.search(r"\b(log|track|add|ate|had|consumed|record)\b", lower))
    is_info_intent = bool(re.search(r"\b(calories|calorie|nutrition|protein|carbs|fat|macros|macro)\b", lower))

    matched = _match_food(lower)
    if not matched:
        return None

    food_key, info = matched
    weight_g, qty_str = _extract_quantity_and_weight(lower, info.get("unit_g", 100))
    ratio = weight_g / 100.0

    calories = int(round(info["cal"] * ratio))
    protein = round(info["p"] * ratio, 1)
    carbs = round(info["c"] * ratio, 1)
    fat = round(info["f"] * ratio, 1)
    display_name = food_key.title()

    if is_log_intent:
        meal = _detect_meal_type(lower)
        action_data = {
            "type": "log_food",
            "data": {
                "foodName": display_name,
                "calories": calories,
                "proteinG": protein,
                "carbsG": carbs,
                "fatG": fat,
                "mealType": meal,
                "quantity": qty_str,
            }
        }
        text = (
            f"Logged **{qty_str} of {display_name}** to your {meal.title()}!\n\n"
            f"📊 **Macros:** {calories} kcal | Protein: {protein}g | Carbs: {carbs}g | Fat: {fat}g\n\n"
            f"ACTION:{json.dumps(action_data)}"
        )
        return {"text": text, "action": action_data, "source": "inline-engine"}

    if is_info_intent or "how much" in lower or "what is" in lower:
        text = (
            f"**{display_name}** ({qty_str}):\n"
            f"• **Calories:** {calories} kcal\n"
            f"• **Protein:** {protein}g\n"
            f"• **Carbohydrates:** {carbs}g\n"
            f"• **Fat:** {fat}g\n\n"
            f"*(Values calculated based on standard nutrition reference: {info['cal']} kcal & {info['p']}g protein per 100g)*"
        )
        return {"text": text, "action": None, "source": "inline-engine"}

    return None

def try_inline_workout_logic(user_message: str) -> Optional[Dict[str, Any]]:
    lower = user_message.lower()
    is_log_intent = bool(re.search(r"\b(log|track|add|record|finished|did)\b", lower) and ("workout" in lower or "sets" in lower or "exercise" in lower))

    # Match exercises in text
    matched_exercises = []
    for ex_name, ex_info in EXERCISE_DATABASE.items():
        if re.search(rf"\b{re.escape(ex_name)}\b", lower):
            # Try to extract sets and reps if provided: e.g. "4 sets of 10"
            sr_match = re.search(rf"(\d+)\s*sets?\s*(?:of\s*(\d+(?:-\d+)?))?\s*(?:reps?)?.*?\b{re.escape(ex_name)}\b", lower)
            if not sr_match:
                sr_match = re.search(rf"\b{re.escape(ex_name)}\b.*?(?:for\s*)?(\d+)\s*sets?(?:\s*(?:of\s*|x\s*)(\d+(?:-\d+)?))?", lower)
            sets = int(sr_match.group(1)) if sr_match and sr_match.group(1) else ex_info["default_sets"]
            reps = str(sr_match.group(2)) if sr_match and sr_match.group(2) else ex_info["default_reps"]
            matched_exercises.append({
                "exerciseName": ex_name.title(),
                "sets": sets,
                "reps": reps,
                "muscles": ex_info["muscles"],
                "form": ex_info["form"],
            })

    if is_log_intent and matched_exercises:
        action_data = {
            "type": "add_workout",
            "data": {
                "workoutName": f"{matched_exercises[0]['exerciseName']} Session",
                "exercises": [
                    {"exerciseName": ex["exerciseName"], "sets": ex["sets"], "reps": ex["reps"]}
                    for ex in matched_exercises
                ]
            }
        }
        lines = [f"Great work! Logged your workout with {len(matched_exercises)} exercise(s):"]
        for ex in matched_exercises:
            lines.append(f"• **{ex['exerciseName']}**: {ex['sets']} sets × {ex['reps']} reps")
        lines.append(f"\nACTION:{json.dumps(action_data)}")
        return {"text": "\n".join(lines), "action": action_data, "source": "inline-engine"}

    # Form & muscle questions: e.g. "what muscles does bench press work" or "how to do squat"
    if matched_exercises and any(q in lower for q in ["how to", "form", "technique", "muscle", "muscles", "work", "do"]):
        ex = matched_exercises[0]
        text = (
            f"**{ex['exerciseName']} Guide:**\n"
            f"• **Primary Muscles Worked:** {ex['muscles']}\n"
            f"• **Standard Target:** {ex['sets']} sets of {ex['reps']} reps\n"
            f"• **Proper Form:** {ex['form']}\n"
        )
        return {"text": text, "action": None, "source": "inline-engine"}

    return None

def try_inline_faq_logic(user_message: str) -> Optional[Dict[str, Any]]:
    lower = user_message.lower()
    for topic, answer in FITNESS_QA_TOPICS.items():
        if topic in lower:
            return {"text": answer, "action": None, "source": "inline-engine"}
    return None

async def call_openai_chat_fallback(user_message: str, history: List[Dict[str, str]], user_context: Optional[str]) -> Dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "text": "I'm your My Life OS health assistant! You can ask me to log food (e.g. 'log 200g chicken breast'), track workouts (e.g. 'log 4 sets of 10 bench press'), or check exercise technique and nutrition facts.",
            "action": None,
            "source": "heuristic-fallback"
        }

    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nUser Context:\n{user_context or 'Standard active user'}"}
    ]
    for h in history[-6:]:  # Keep last 6 messages
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                }
            )
            if res.status_code == 200:
                data = res.json()
                raw_text = data["choices"][0]["message"]["content"]
                action = None
                text = raw_text
                action_match = re.search(r"ACTION:(\{.*\})", raw_text)
                if action_match:
                    try:
                        action = json.loads(action_match.group(1))
                        text = re.sub(r"ACTION:\{.*\}", "", raw_text).strip()
                    except Exception:
                        pass
                return {"text": text, "action": action, "source": "openai"}
    except Exception as e:
        print(f"[Assistant] OpenAI fallback error: {e}")

    return {
        "text": "I received your message. You can log meals (e.g. 'log 2 eggs'), workouts (e.g. 'log 3 sets 10 pullups'), or ask about exercise form and nutrition.",
        "action": None,
        "source": "heuristic-fallback"
    }

async def process_assistant_chat(user_message: str, history: List[Dict[str, str]] = None, user_context: Optional[str] = None) -> Dict[str, Any]:
    """
    Inline-First AI Assistant Pipeline:
    1. Check inline food nutrition & logging engine (0ms latency, $0 cost).
    2. Check inline workout logging & exercise technique engine.
    3. Check inline fitness FAQ & guidelines.
    4. Fall back to OpenAI GPT-4o-mini only for complex conversational questions.
    """
    history = history or []

    # Step 1: Inline Food Engine
    food_res = try_inline_food_logic(user_message)
    if food_res:
        return food_res

    # Step 2: Inline Workout Engine
    workout_res = try_inline_workout_logic(user_message)
    if workout_res:
        return workout_res

    # Step 3: Inline FAQ Engine
    faq_res = try_inline_faq_logic(user_message)
    if faq_res:
        return faq_res

    # Step 4: External OpenAI Fallback
    return await call_openai_chat_fallback(user_message, history, user_context)
