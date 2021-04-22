const axios = require('axios')
const io = require('socket.io')(8080, {
  cors: {
    origin: '*',
  }
});

class Game{
  constructor(link){
      this.link = link
      this.id = link.slice(20, 28)
      this.date
      this.white = 'Anonymous'
      this.black = 'Anonymous'
  }

  updateJson(json){
      this.id = json.id
      this.date = json.date
      this.black = json.players.black.user.id
      this.white = json.players.white.user.id
  }
}


let join = []
let spec = []
let end = []

const fetchGame = async (gameId) => {
  try {
      //console.log('here')
      const { data } = await axios.get(`https://lichess.org/game/export/${gameId}`, { headers: { 'Accept': 'application/json' } })
      //console.log(data)
      return JSON.stringify(data)
  } catch (err) {
      console.error(err)
  }
}

const moveGame = (source, destination, item) => {
  let sourceClone = [...source]
  let destinationClone = [...destination]

  sourceClone = sourceClone.filter(i => i.id !== item.id)
  destinationClone.unshift(item) 

  return {a: sourceClone, b: destinationClone}
}

const addGame = link => {
  if(link.includes('https://lichess.org/') && join.filter(c => c.link === link).length === 0){
      const card = new Game(link)
      return card
  }
}

setInterval(() => {
  join.map( c => {
      //console.log(c.link)
      //console.log(c.id)
      fetchGame(c.id).then((data) => {
          const obj = JSON.parse(data)
          if(obj.status === 'started'){
              c.updateJson(obj)
              let {a, b} = moveGame(join, spec, c)
              join = a
              spec = b
          }
      })
  })
  spec.map( c => {
      fetchGame(c.id).then((data) => {
          const obj = JSON.parse(data)
          if(obj.status !== 'started'){
              let {a, b} = moveGame(spec, end, c)
              spec = a
              end = b
          }
      })
  })
  updateGames()
}, 5000)


const updateGames = () => {
  const data = JSON.stringify(join, spec, end)
  io.sockets.emit('UpdateGames', data)
}

io.on('connection', (socket) => {
  socket.on('new', link => {
    console.log('connection')
    join.push(addGame(link, join))
  })
})

