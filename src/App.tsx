import React, { useState, useEffect, useRef } from "react";
import { TelepartyClient, SocketMessageTypes } from "teleparty-websocket-lib";
import Avatar1 from "../src/assets/avatar1.png";
import Avatar2 from "../src/assets/avatar2.png";
import Avatar3 from "../src/assets/avatar3.png";

interface ChatMessage {
  userIcon?: string;
  userNickname?: string;
  body?: string;
}

interface UserSettings {
  userNickname?: string;
}

interface User {
  socketConnectionId?: string;
  userSettings?: UserSettings;
}

interface TypingPresence {
  anyoneTyping?: boolean;
  usersTyping?: string[];
}

interface ReceivedData {
  type?: string;
  data?: any;
}

const avatars = [Avatar1, Avatar2, Avatar3];
const randomAvatar = avatars[Math.floor(Math.random() * avatars?.length)];

function App() {
  const [nickname, setNickname] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [userData, setUserData] = useState<User[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingPresence, setTypingPresence] = useState<TypingPresence>({
    anyoneTyping: false,
    usersTyping: [],
  });
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState<string>("");

  const typingTimeoutRef = useRef<any>(null);
  const clientRef = useRef<any>(null);

  const handleCreateRoom = async () => {
    try {
      const newRoomId = await clientRef.current?.createChatRoom?.(
        nickname,
        randomAvatar
      );
      if (newRoomId) {
        setConnected(true);
        setRoomId(newRoomId);
      }
    } catch (err) {
      alert("Cannot create room, please wait till connection is ready!");
      console.error(err);
    }
  };

  const handleJoinRoom = async () => {
    try {
      await clientRef.current?.joinChatRoom?.(nickname, roomId, randomAvatar);
      setConnected(true);
      console.log("Joined room", roomId);
    } catch (err) {
      alert("Cannot join room, please wait till connection is ready!");
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    try {
      await clientRef.current?.sendMessage?.(SocketMessageTypes.SEND_MESSAGE, {
        body: messageInput.trim(),
      });
      setMessageInput("");
    } catch (err) {
      console.error("Send message failed:", err);
    }
  };

  const handleTyping = () => {
    if (!connected) return;

    clientRef.current?.sendMessage?.(SocketMessageTypes.SET_TYPING_PRESENCE, {
      typing: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      clientRef.current?.sendMessage?.(
        SocketMessageTypes.SET_TYPING_PRESENCE,
        { typing: false }
      );
    }, 100);
  };

  useEffect(() => {
    const eventHandler = {
      onConnectionReady: async () => {
        console.log("Connection is ready!!!");
      },
      onClose: () => {
        console.log("Socket disconnected!!");
        setConnected(false);
        setNickname("");
        setRoomId("");
        alert("You have been disconnected, click OK to reload");
        window.location.reload();
      },
      onMessage: (receivedData: ReceivedData) => {
        console.log("Received message:", receivedData);
        console.log("type:", receivedData?.type);

        switch (receivedData?.type) {
          case SocketMessageTypes.SEND_MESSAGE: {
            const { userIcon, userNickname, body } = receivedData?.data ?? {};
            setChatMessages((prev) => [
              ...prev,
              { userIcon, userNickname, body },
            ]);
            break;
          }
          case "userList": {
            setUserData(receivedData?.data ?? []);
            break;
          }
          case SocketMessageTypes.SET_TYPING_PRESENCE: {
            setTypingPresence(receivedData?.data ?? {});
            break;
          }
          default:
            console.log("Unknown message type:", receivedData?.type);
        }
      },
    };

    clientRef.current = new TelepartyClient(eventHandler);
  }, []);

  useEffect(() => {
    if (typingPresence?.anyoneTyping && userData?.length > 0) {
      const typingNicknames = typingPresence?.usersTyping
        ?.map((id) => {
          const matchedUser = userData?.find(
            (user) => user?.socketConnectionId === id
          );
          return matchedUser?.userSettings?.userNickname;
        })
        .filter(Boolean) as string[];
      setTypingUsers(typingNicknames);
    } else {
      setTypingUsers([]);
    }
  }, [typingPresence, userData]);

  return (
    <div style={{ padding: 20 }}>
      {!connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            style={{ height: "30px", width: "200px" }}
            placeholder="Your Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input
            style={{ height: "30px", width: "200px" }}
            placeholder="Room ID (only if joining)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button disabled={nickname?.length <= 0} onClick={handleCreateRoom}>
            Create Room
          </button>
          <button
            disabled={nickname?.length <= 0 || roomId?.length <= 0}
            onClick={handleJoinRoom}
          >
            Join Room
          </button>
        </div>
      )}

      {connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <h3>Room ID: {roomId}</h3>

          <div
            style={{
              border: "1px solid black",
              height: 300,
              overflowY: "scroll",
              padding: 10,
              width: 300,
            }}
          >
            {chatMessages?.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <img
                  src={msg?.userIcon}
                  alt="avatar"
                  style={{ width: "30px", height: "30px", marginRight: "10px" }}
                />
                <p style={{ fontWeight: "bold" }}>
                  {msg?.userNickname}
                  {":"}&nbsp;
                </p>
                <p
                  style={{
                    whiteSpace: "normal",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                  }}
                >
                  {msg?.body}
                </p>
              </div>
            ))}
          </div>

          {typingUsers?.length > 0 && (
            <div style={{ fontStyle: "italic", color: "gray" }}>
              {typingUsers?.join(", ")}{" "}
              {typingUsers?.length === 1 ? "is" : "are"} typing...
            </div>
          )}

          <input
            style={{ height: "30px" }}
            placeholder="Type your message"
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}

export default App;
