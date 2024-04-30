import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "./src/LoginScreen";
import GlobalState  from "./src/contexts/index";

// import Call from "./src/CallScreen";
import Call from "./src/CallTwo"

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GlobalState>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Call" component={Call} />
        </Stack.Navigator>
      </NavigationContainer>
    </GlobalState>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
});
