import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import DiaryListScreen from '../screens/diary/DiaryListScreen';
import DiaryWriteScreen from '../screens/diary/DiaryWriteScreen';
import DiaryEntryScreen from '../screens/diary/DiaryEntryScreen';
import FitnessScreen from '../screens/fitness/FitnessScreen';
import AddWorkoutScreen from '../screens/fitness/AddWorkoutScreen';
import LogFoodScreen from '../screens/fitness/LogFoodScreen';
import WorkoutPlannerScreen from '../screens/fitness/WorkoutPlannerScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import TodoScreen from '../screens/todo/TodoScreen';
import BodyScanScreen from '../screens/bodyscan/BodyScanScreen';
import ExpenseScreen from '../screens/expenses/ExpenseScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import GroupDetailScreen from '../screens/expenses/GroupDetailScreen';
import ScanBillScreen from '../screens/expenses/ScanBillScreen';
import VoiceAssistantScreen from '../screens/expenses/VoiceAssistantScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { accessToken, user } = useAuthStore();
  const isLoggedIn = !!accessToken;
  const needsOnboarding = isLoggedIn && accessToken && user && user.onboardingCompleted === false;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : isLoggedIn ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="DiaryList" component={DiaryListScreen} />
            <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} />
            <Stack.Screen name="DiaryEntry" component={DiaryEntryScreen} />
            <Stack.Screen name="FitnessList" component={FitnessScreen} />
            <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} />
            <Stack.Screen name="LogFood" component={LogFoodScreen} />
            <Stack.Screen name="WorkoutPlanner" component={WorkoutPlannerScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} />
            <Stack.Screen name="TodoList" component={TodoScreen} />
            <Stack.Screen name="BodyScan" component={BodyScanScreen} />
            <Stack.Screen name="ExpenseList" component={ExpenseScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="ScanBill" component={ScanBillScreen} />
            <Stack.Screen name="VoiceAssistant" component={VoiceAssistantScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}