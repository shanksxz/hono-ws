import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/cloudflare-workers'
import { WSContext } from 'hono/ws';

interface Room {
  client : WSContext[]
}

interface Message {
  type: 'join' | 'message' | 'leave' | 'error' | 'success';
  room: string;
  message?: string;
}

const room = new Map<string, Room>()
const app = new Hono().get('ws', 
  upgradeWebSocket((c) => {
    return {
      onError: (error) => {
        console.error('Error:', error)
      },
      onMessage: (event, ws) => {
        let msg : Message;
        try {
          //? do i need to convert the event.data to string or is it already a string?
          msg = JSON.parse(event.data) as Message;
        } catch (error) {
          console.error('Error parsing message:', error)
          return;
        }
      
        switch (msg.type) {
          case 'join':
            if(room.has(msg.room)){
              // room already exists
              room.get(msg.room)!.client.push(ws)
              ws.send(JSON.stringify({type: 'success', room: msg.room, message: 'Joined room'}))
            } else {
              // room does not exist
              room.set(msg.room, {client: [ws]})
              ws.send(JSON.stringify({type: 'success', room: msg.room, message: 'Created room'}))
            }
            break;
          case 'message':
            if(room.has(msg.room)){
              room.get(msg.room)!.client.forEach(client => {
                client.send(JSON.stringify({type: 'message', room: msg.room, message: msg.message}))
              })
            } else {
              ws.send(JSON.stringify({type: 'error', room: msg.room, message: 'Room does not exist'}))
            }
            break;
          case 'leave':
            if(room.has(msg.room)){
              room.get(msg.room)!.client = room.get(msg.room)!.client.filter(client => client !== ws)
              ws.send(JSON.stringify({type: 'success', room: msg.room, message: 'Left room'}))
            } else {
              ws.send(JSON.stringify({type: 'error', room: msg.room, message: 'Room does not exist'}))
            }
            break;
          default:
            ws.send(JSON.stringify({type: 'error', room: msg.room, message: 'Invalid message type'}))
            break;
        }
        
      },
      onClose: (ws) => {
        console.log('Connection closed')
      }
    }
  })
)



export default app
