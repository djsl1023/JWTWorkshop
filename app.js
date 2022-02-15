const express = require('express');
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require('./db');
const path = require('path');
const { user } = require('pg/lib/defaults');

async function requireToken(req, res, next) {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/auth', requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/users/:id/notes', requireToken, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const tokenUser = req.user;

    const tokenId = tokenUser.id;
    //userId is a string, tokenId is a number
    if (+userId === tokenId) {
      const user = await User.findByPk(userId, {
        include: {
          model: Note,
        },
      });
      res.send(user.notes);
    } else {
      res.sendStatus(401);
    }
    // const noteList = await Note.findAll({
    //   where: {
    //     userId: userId,
    //   },
    // });
    // res.send(noteList);
  } catch (err) {
    next(err);
  }
});
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
