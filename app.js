const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "./userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  } catch (e) {
    console.log(`DB error: ${e.message}`);
    process.exit(1);
  }
  app.listen(3000, () => {
    console.log("Server successfully started");
  });
};

initializeDBAndServer();

//Register a user API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const getUserDetailsQuery = `SELECT * FROM user WHERE username='${username}'`;
  const userDetails = await db.get(getUserDetailsQuery);
  if (userDetails === undefined) {
    const passwordLength = password.length;
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(request.body.password, 10);
      const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`User created successfully`);
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login API

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserDetailsQuery = `SELECT * FROM user WHERE username='${username}'`;
  const userDetails = await db.get(getUserDetailsQuery);
  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//change password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUserDetailsQuery = `SELECT * FROM user WHERE username='${username}'`;
  const userDetails = await db.get(getUserDetailsQuery);
  const isPasswordMatched = await bcrypt.compare(
    oldPassword,
    userDetails.password
  );
  if (isPasswordMatched === true) {
    //Update it with new Password
    const passwordLength = newPassword.length;
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateUserQuery = `
      UPDATE user
      SET password='${hashedPassword}' WHERE username = '${username}'`;
      const dbResponse = await db.run(updateUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Password updated`);
    }
  } else {
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;
