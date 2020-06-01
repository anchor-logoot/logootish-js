const count = parseInt(process.argv[2]) || 1024
const users = parseInt(process.argv[3]) || 3
const maxlen = parseInt(process.argv[4]) || 10

let total_length = 0
const ops = ([...new Array(count)]).map((v, i) => {
  const pos = Math.floor(Math.random() * (total_length + 1))
  const len = Math.ceil(Math.random() * maxlen)
  const user = 'U' + Math.ceil(Math.random() * users)
  total_length += len
  return { p: pos, l: len, u: user }
})

console.log(JSON.stringify({ ops, n_users: users }))