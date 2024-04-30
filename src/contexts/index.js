import { createContext, useState } from 'react'

export const GlobalContext = createContext()

function GlobalState ({ children }) {
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUser, setCurrentUser] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [allChatRooms, setAllChatRooms] = useState([])
  const [currentGroupName, setCurrentGroupName] = useState('')
  const [allChatMessages, setAllChatMessages] = useState([])
  const [currentChatMesage, setCurrentChatMessage] = useState('')

  const [id, setId] = useState("")

  return (
    <GlobalContext.Provider
      value={{
        currentUserName,
        setCurrentUserName,
        currentUser,
        setCurrentUser,
        allUsers,
        setAllUsers,
        allChatRooms,
        setAllChatRooms,
        id,
        setId,
        currentGroupName,
        setCurrentGroupName,
        allChatMessages,
        setAllChatMessages,
        currentChatMesage,
        setCurrentChatMessage
      }}
    >
      {children}
    </GlobalContext.Provider>
  )
}

export default GlobalState
