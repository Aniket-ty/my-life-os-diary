import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

CATEGORY_MAP = {
    "food": "Food", "lunch": "Food", "dinner": "Food", "breakfast": "Food",
    "coffee": "Food", "tea": "Food", "snack": "Food", "cafe": "Food", "pizza": "Food", "burger": "Food",
    "groceries": "Groceries", "grocery": "Groceries", "supermarket": "Groceries", "vegetables": "Groceries",
    "transport": "Transport", "uber": "Transport", "ola": "Transport", "taxi": "Transport", "metro": "Transport", "bus": "Transport", "auto": "Transport", "fuel": "Transport", "petrol": "Transport",
    "shopping": "Shopping", "clothes": "Shopping", "shoes": "Shopping", "amazon": "Shopping", "flipkart": "Shopping",
    "bills": "Bills", "electricity": "Bills", "wifi": "Bills", "recharge": "Bills", "water": "Bills", "rent": "Rent",
    "entertainment": "Entertainment", "movie": "Entertainment", "netflix": "Entertainment", "concert": "Entertainment",
    "health": "Health", "medicine": "Health", "doctor": "Health", "pharmacy": "Health",
    "fitness": "Fitness", "gym": "Fitness", "protein": "Fitness",
    "travel": "Travel", "flight": "Travel", "hotel": "Travel",
    "education": "Education", "books": "Education", "course": "Education",
}

CURRENCY_MAP = {
    "rupee": "INR", "rupees": "INR", "rs": "INR", "inr": "INR", "₹": "INR",
    "dollar": "USD", "dollars": "USD", "usd": "USD", "$": "USD", "bucks": "USD",
    "euro": "EUR", "euros": "EUR", "eur": "EUR", "€": "EUR",
    "pound": "GBP", "pounds": "GBP", "gbp": "GBP", "£": "GBP",
    "dirham": "AED", "dirhams": "AED", "aed": "AED",
    "yen": "JPY", "jpy": "JPY", "¥": "JPY",
    "cad": "CAD", "aud": "AUD", "sgd": "SGD",
}

def parse_amount(text: str) -> Optional[float]:
    # Look for currency prefix or numeric amounts
    clean = text.replace(",", "")
    m = re.search(r"(?:₹|\$|€|£|rs\.?|inr|rupees?)\s*(\d+(?:\.\d{1,2})?)", clean, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d+(?:\.\d{1,2})?)\s*(?:rupees?|bucks|dollars|euros|inr|rs|pounds|dirhams)", clean, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r"\b(\d+(?:\.\d{1,2})?)\b", clean)
    if m:
        return float(m.group(1))
    return None

def parse_currency(text: str) -> str:
    lower = text.lower()
    for word, code in CURRENCY_MAP.items():
        if re.search(rf"\b{re.escape(word)}\b", lower):
            return code
    if "$" in text:
        return "USD"
    if "₹" in text:
        return "INR"
    if "€" in text:
        return "EUR"
    if "£" in text:
        return "GBP"
    return "INR"

def parse_category(text: str) -> Optional[str]:
    lower = text.lower()
    for word, cat in CATEGORY_MAP.items():
        if re.search(rf"\b{re.escape(word)}\b", lower):
            return cat
    return None

def parse_date(text: str) -> Optional[str]:
    lower = text.lower()
    today = datetime.now()
    if "yesterday" in lower:
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")
    if "tomorrow" in lower:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    if "today" in lower:
        return today.strftime("%Y-%m-%d")
    
    # ISO date YYYY-MM-DD
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if m:
        return m.group(1)
    
    return today.strftime("%Y-%m-%d")

def parse_voice_command(text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    lower = text.lower().strip()
    ctx = context or {}
    groups = ctx.get("groups", [])
    members = ctx.get("members", [])

    # 1. Navigation intents
    if re.search(r"\b(?:open|show|go to)\s+(?:expenses?|spending)\b", lower):
        return {"intent": "OPEN_EXPENSES", "confidence": 0.98, "entities": {"route": "/expenses"}}

    if re.search(r"\b(?:open|show|go to)\s+(?:groups?|splitwise)\b", lower):
        return {"intent": "OPEN_GROUP", "confidence": 0.98, "entities": {"route": "/expenses?tab=groups"}}

    m_group_nav = re.search(r"\b(?:open|show|view)\s+(?:my\s+)?([a-z0-9 ]+?)(?:\s+trip|\s+group)?$", lower)
    if m_group_nav and ("trip" in lower or "group" in lower or any(g.get("name", "").lower() in lower for g in groups)):
        g_name = m_group_nav.group(1).title()
        return {"intent": "OPEN_GROUP", "confidence": 0.92, "entities": {"groupName": g_name}}

    if re.search(r"\b(?:scan|read)\s+(?:bill|receipt|invoice)\b", lower):
        return {"intent": "SCAN_BILL", "confidence": 0.95, "entities": {}}

    # 2. Currency conversion
    m_conv = re.search(r"\bconvert\s+(\d+(?:\.\d{1,2})?)\s*([a-z$€£₹]+)\s+(?:to|into|in)\s+([a-z$€£₹]+)", lower)
    if m_conv:
        amt = float(m_conv.group(1))
        from_cur = parse_currency(m_conv.group(2))
        to_cur = parse_currency(m_conv.group(3))
        return {
            "intent": "CONVERT_CURRENCY",
            "confidence": 0.99,
            "entities": {"amount": amt, "fromCurrency": from_cur, "toCurrency": to_cur}
        }

    # 3. Balance Queries
    # "How much does Rahul owe me?"
    m_owes_me = re.search(r"\bhow much does\s+([a-z]+)\s+owe\s+me\b", lower)
    if m_owes_me:
        name = m_owes_me.group(1).title()
        return {"intent": "GET_USER_BALANCE", "confidence": 0.98, "entities": {"memberName": name, "type": "OWED_TO_ME"}}

    # "How much do I owe Rahul?"
    m_i_owe = re.search(r"\bhow much do i owe\s+([a-z]+)\b", lower)
    if m_i_owe:
        name = m_i_owe.group(1).title()
        return {"intent": "GET_USER_BALANCE", "confidence": 0.98, "entities": {"memberName": name, "type": "I_OWE"}}

    if re.search(r"\b(?:group balance|who owes who|who owes whom|settlements)\b", lower):
        return {"intent": "GET_GROUP_BALANCE", "confidence": 0.95, "entities": {}}

    # 4. Spending Totals Queries
    # "How much did I spend today?"
    if re.search(r"\bhow much\s+(?:did i spend|spent|total)\s+today\b", lower):
        return {"intent": "GET_DAILY_TOTAL", "confidence": 0.99, "entities": {"period": "today"}}

    # "How much did I spend this month?"
    if re.search(r"\bhow much\s+(?:did i spend|spent|total)\s+this month\b", lower):
        cat = parse_category(lower)
        if cat:
            return {"intent": "GET_CATEGORY_TOTAL", "confidence": 0.98, "entities": {"category": cat, "period": "this_month"}}
        return {"intent": "GET_MONTHLY_TOTAL", "confidence": 0.99, "entities": {"period": "this_month"}}

    # "How much did I spend on food this month?"
    m_cat_spent = re.search(r"\bhow much\s+(?:did i spend|spent)\s+on\s+([a-z]+)", lower)
    if m_cat_spent:
        cat = parse_category(m_cat_spent.group(1)) or m_cat_spent.group(1).title()
        return {"intent": "GET_CATEGORY_TOTAL", "confidence": 0.97, "entities": {"category": cat, "period": "this_month"}}

    # 5. Settlement Creation
    # "Mark Rahul's 500 rupees as paid" or "Rahul paid me 400"
    m_settle = re.search(r"\b(?:mark\s+)?([a-z]+)(?:'s)?\s+(?:paid me|paid\s+me\s+)?(?:₹|\$|€|£)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rupees?|bucks|inr)?\s*(?:as paid|paid)?\b", lower)
    if m_settle and ("paid" in lower or "settle" in lower):
        name = m_settle.group(1).title()
        amt = float(m_settle.group(2))
        return {
            "intent": "CREATE_SETTLEMENT",
            "confidence": 0.96,
            "entities": {"memberName": name, "amount": amt, "currency": parse_currency(lower)}
        }

    # 6. Group Creation
    # "Create a group called Goa Trip"
    m_create_g = re.search(r"\bcreate\s+(?:a\s+)?group\s+(?:called|named)?\s*(.+)$", lower)
    if m_create_g:
        g_name = m_create_g.group(1).strip().title()
        return {"intent": "CREATE_GROUP", "confidence": 0.98, "entities": {"groupName": g_name}}

    # 7. Add Group Member
    # "Add Rahul to Goa Trip"
    m_add_m = re.search(r"\badd\s+([a-z]+)\s+to\s+(.+)$", lower)
    if m_add_m and not re.search(r"\d", lower):
        m_name = m_add_m.group(1).title()
        g_name = m_add_m.group(2).strip().title()
        return {"intent": "ADD_GROUP_MEMBER", "confidence": 0.98, "entities": {"memberName": m_name, "groupName": g_name}}

    # 8. Delete Expense
    # "Delete my 5000 hotel expense"
    if re.search(r"\b(?:delete|remove|cancel)\s+(?:my\s+)?expense\b", lower) or ("delete" in lower and parse_amount(lower)):
        amt = parse_amount(lower)
        cat = parse_category(lower)
        return {
            "intent": "DELETE_EXPENSE",
            "confidence": 0.95,
            "entities": {"amount": amt, "category": cat, "description": cat or "Expense"}
        }

    # 9. Group Expense Creation
    # "Add a 2400 rupees dinner expense to Goa Trip" or "Add 2400 dinner to Goa Trip and split equally between me, Rahul and Aman"
    if ("trip" in lower or "group" in lower or "split" in lower) and parse_amount(lower):
        amt = parse_amount(lower)
        cur = parse_currency(lower)
        cat = parse_category(lower) or "Food"
        date = parse_date(lower)
        
        # Group name detection
        group_name = None
        for g in groups:
            if g.get("name", "").lower() in lower:
                group_name = g.get("name")
                break
        if not group_name:
            m_g = re.search(r"\b(?:to|in)\s+([a-z0-9 ]+?)(?:\s+and\s+split|\s+group)?$", lower)
            if m_g:
                group_name = m_g.group(1).strip().title()

        # Members detection
        split_members = ["CURRENT_USER"]
        if "split" in lower:
            for m in ["rahul", "aman", "rohit", "priya", "aniket", "alex"]:
                if m in lower:
                    split_members.append(m.title())
        split_members = list(dict.fromkeys(split_members))

        return {
            "intent": "CREATE_GROUP_EXPENSE",
            "confidence": 0.96,
            "entities": {
                "amount": amt,
                "currency": cur,
                "category": cat,
                "description": cat or "Dinner",
                "groupName": group_name or "Trip",
                "paidBy": "CURRENT_USER",
                "splitType": "EQUAL",
                "members": split_members,
                "date": date,
            }
        }

    # 10. Personal Expense Creation
    # "I spent 500 rupees on lunch" or "Add 800 rupees for groceries"
    amt = parse_amount(lower)
    if amt is not None:
        cur = parse_currency(lower)
        cat = parse_category(lower) or "Other"
        date = parse_date(lower)
        
        # Description extraction
        desc = cat
        m_desc = re.search(r"\b(?:on|for)\s+([a-z0-9 ]+?)(?:\s+yesterday|\s+today)?$", lower)
        if m_desc:
            desc = m_desc.group(1).strip().capitalize()

        return {
            "intent": "CREATE_EXPENSE",
            "confidence": 0.97,
            "entities": {
                "amount": amt,
                "currency": cur,
                "category": cat,
                "description": desc,
                "date": date,
            }
        }

    # Fallback
    return {
        "intent": "UNKNOWN",
        "confidence": 0.3,
        "entities": {},
        "clarification": "I didn't quite catch that. You can say 'I spent 500 on lunch' or 'Open groups'."
    }
