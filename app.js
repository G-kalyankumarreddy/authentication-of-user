const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");

const dbpath = path.join(__dirname, "userData.db");
let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
  }
};

initializeDBAndServer();
app.use(express.json());

const validatePassword = (password) => {
  return password.length > 4;
};

//API1 POST NEW USER REGISTRATION
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userNameQuery = `SELECT *
  FROM user
  WHERE username='${username}';`;

  const dbUser = await database.get(userNameQuery);
  if (dbUser === undefined) {
    const userRegisterQuery = `INSERT INTO user(username,name,password,gender,location)
   VALUES (
    '${username}',
   '${name}',
   '${hashedPassword}',
   '${gender}',
   '${location}');`;

    if (validatePassword(password)) {
      await database.run(userRegisterQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API2 POST LOGIN
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const loginUsernameQuery = `SELECT * FROM user WHERE username='${username}';`;
  const userNameExists = await database.get(loginUsernameQuery);
  if (userNameExists === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const userPassword = await bcrypt.compare(
      password,
      userNameExists.password
    );
    if (userPassword === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API3 PUT CHANGE PASSWORD

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE
            user
          SET
            password = '${hashedPassword}'
          WHERE
            username = '${username}';`;

        const user = await database.run(updatePasswordQuery);

        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
