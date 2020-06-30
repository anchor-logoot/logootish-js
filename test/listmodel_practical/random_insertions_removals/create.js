const count = parseInt(process.argv[2]) || 1024
const users = parseInt(process.argv[3]) || 3
const maxlen = parseInt(process.argv[4]) || 10

let total_length = 0
const ops = ([...new Array(count)]).map((v, i) => {
  const pos = Math.floor(Math.random() * (total_length + 1))
  let len = Math.ceil(Math.random() * maxlen)
  const user = 'U' + Math.ceil(Math.random() * users)
  const type = total_length > 0 ? (Math.random() >= 0.5 ? 'i' : 'r') : 'i'
  if (type === 'i') {
    total_length += len
  } else {
    if (pos + len > total_length) {
      len = total_length - pos
    }
    total_length -= len
  }
  return { t: type, p: pos, l: len, u: user }
})

console.log(JSON.stringify({ ops, n_users: users }))