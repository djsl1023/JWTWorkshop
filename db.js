const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { STRING } = Sequelize;
const config = {
  logging: false,
};
if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);
const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

const Note = conn.define('note', {
  text: STRING,
});

User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
  try {
    const isVerified = await jwt.verify(token, process.env.JWT);
    const user = await User.findByPk(isVerified.userId);
    if (user) {
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};
User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const match = await bcrypt.compare(password, user.password);
  if (match) {
    return await jwt.sign({ userId: user.id }, process.env.JWT);
    // return user.id;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};
User.beforeCreate(async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, 1);
  user.password = hashedPassword;
});
const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const noteList = [
    { text: '123456789' },
    { text: 'hello world' },
    { text: 'jwt project' },
    { text: 'fourth note' },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const [numbers, hello, project, four] = await Promise.all(
    noteList.map((note) => Note.create(note))
  );

  await lucy.setNotes([numbers, four]);
  await moe.setNotes(hello);
  await larry.setNotes(project);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};
module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
