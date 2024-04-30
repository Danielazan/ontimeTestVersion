import { View, TextInput, Button, Alert, StyleSheet  } from 'react-native'
import React,{ useState,useContext, useEffect } from 'react'
import { GlobalContext } from './contexts';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');

    const {id,setId} = useContext(GlobalContext)

    
    
    

  const handleLogin = () => {
    setId(username)

    navigation.navigate('Call')
  };
  return (
    <View style={styles.container}>
    <TextInput
      style={styles.input}
      placeholder="Enter username"
      value={username}
      onChangeText={text => setUsername(text)}
    />
    <Button title="Login" onPress={handleLogin} />
  </View>
  )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    input: {
      height: 40,
      width: '80%',
      borderColor: 'gray',
      borderWidth: 1,
      marginBottom: 20,
      paddingHorizontal: 10,
    },
  });

export default LoginScreen