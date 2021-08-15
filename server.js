const express = require('express')
const bcrypt = require('bcryptjs')
const cors = require('cors')
const knex = require('knex')

const PORT = process.env.PORT || 3000

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'postgres',
        database: 'face-recognition',
    },
})

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_, res) => {
    db('users').then(users => res.json(users))
})

app.post('/signin', (req, res) => {
    db.select('email', 'hash')
        .from('login')
        .where('email', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
            if (isValid) {
                return db('users')
                    .where('email', req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(() => res.status(400).json('unable to get user'))
            } else {
                res.status(400).json('wrong credentials')
            }
        })
        .catch(() => {
            res.status(400).json('wrong credentials')
        })
})

app.post('/signup', (req, res) => {
    const { email, name, password } = req.body
    const hash = bcrypt.hashSync(password)
    db.transaction(trx => {
        trx.insert({
            hash,
            email,
        })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0],
                        name: name,
                        joined: new Date(),
                    })
                    .then(user => {
                        res.json(user[0])
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    }).catch(() => {
        res.status(400).json('unable to register')
    })
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params
    db('users')
        .where({ id })
        .then(user => {
            user.length ? res.json(user[0]) : res.status(400).json('Not found')
        })
        .catch(() => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
    const { id } = req.body
    db('users')
        .where({ id })
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0])
        })
        .catch(() => res.status(400).json('unable to get entries'))
})

app.listen(PORT, () => {
    console.log(`app is running on port ${PORT}`)
})
