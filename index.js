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
      this.black = json.players.black.user ? json.players.black.user.id : 'Anonymous'
      this.white = json.players.white.user ? json.players.white.user.id : 'Anonymous'
  }
}


let join = []
let spec = []
let end = []

const fetchGame = async (gameId) => {
  try {
      const { data } = await axios.get(`https://lichess.org/game/export/${gameId}`, { headers: { 'Accept': 'application/json' } })
      return JSON.stringify(data)
  } catch (err) {
      console.error(err)
      return null
  }
}

const addGame = link => {
  if(link.includes('https://lichess.org/') && join.filter(c => c.link === link).length === 0){
      const card = new Game(link)
      return card
  }
}

setInterval(() => {
  join.map( c => {
      fetchGame(c.id).then((data) => {
          if (data !== null){
            const obj = JSON.parse(data)
            c.updateJson(obj)

            if(obj.status === 'started'){

                spec.unshift(c)
                join = join.filter(game => game !== c)
            }
          }
      })
  })

  spec.map( c => {
      fetchGame(c.id).then((data) => {
        if(data !== null){
            const obj = JSON.parse(data)
            c.updateJson(obj)

            if(obj.status !== 'started'){
                end.unshift(c)
                spec = spec.filter(game => game !== c)
            }
        }
      })
  })

  updateGames()
}, 5000)


const updateGames = () => {
  const data = JSON.stringify({ j: join, s : spec, e: end})
  io.emit('UpdateGames', data)
}

io.on('connection', (socket) => {
  const data = JSON.stringify({ j: join, s : spec, e: end})
  io.to(socket.id).emit('UpdateGames', data)

  socket.on('new', link => {
    join.push(addGame(link, join))
    updateGames()
  })
})

