import * as knex from "knex";
import * as crypto from "crypto";

import KnexAdapter from "../src/database/knex";
import MongoAdapter from "../src/database/mongo";
import { IDatabaseAdapter } from "../src/database/adapter";

const mysql = new KnexAdapter({
  client: "mysql",
  connection: {
    host: "127.0.0.1",
    port: 3306,
    user: "cleverauth-test",
    password: "cleverauth-test",
    database: "cleverauth-test"
  }
});

const postgresql = new KnexAdapter({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "cleverauth-test",
    password: "cleverauth-test",
    database: "cleverauth-test"
  }
});

const mongo = new MongoAdapter("mongodb://127.0.0.1:27017/cleverauth-test");

const adapters: { [index: string]: IDatabaseAdapter } = {
  mysql,
  postgresql,
  mongo
};

const randomId = crypto.randomBytes(16).toString("hex");

describe("Database adapter", () => {
  Object.keys(adapters).forEach(adapterName => {
    const adapter = adapters[adapterName];
    let userId;
    let emailConfirmationToken;
    it(`${adapterName} init()`, async () => {
      await adapter.init();
    });

    it(`${adapterName} insertUser()`, async () => {
      userId = await adapter.insertUser({
        email: `test+${randomId}@example.com`,
        emailConfirmationToken: `token${randomId}`
      });
    });

    it(`${adapterName} insertProvider()`, async () => {
      await adapter.insertProvider({
        userId,
        login: `login${randomId}`,
        data: { someKey: "placeholder string" }
      });
    });
    it(`${adapterName} updateUser()`, async () => {
      await adapter.updateUser({ id: userId, emailConfirmed: true });
      const user = await adapter.findUserById(userId);
      expect(user.emailConfirmed).toEqual(true);
    });

    it(`${adapterName} findUserByEmail()`, async () => {
      const user = await adapter.findUserByEmail(`test+${randomId}@example.com`);
      expect(user.id).toEqual(userId);
      expect(user.email).toEqual(`test+${randomId}@example.com`);
      emailConfirmationToken = user.emailConfirmationToken;
    });

    it(`${adapterName} findUserByEmailConfirmationToken()`, async () => {
      const user = await adapter.findUserByEmailConfirmationToken(`token${randomId}`);
      expect(user.id).toEqual(userId);
      expect(user.email).toEqual(`test+${randomId}@example.com`);
      expect(user.emailConfirmationToken).toEqual(emailConfirmationToken);
    });

    it(`${adapterName} findUserById()`, async () => {
      const user = await adapter.findUserById(userId);
      expect(user.id).toEqual(userId);
      expect(user.email).toEqual(`test+${randomId}@example.com`);
      expect(user.emailConfirmationToken).toEqual(emailConfirmationToken);
    });

    it(`${adapterName} findUserByProviderLogin()`, async () => {
      const user = await adapter.findUserByProviderLogin(`login${randomId}`);
      expect(user.id).toEqual(userId);
      expect(user.email).toEqual(`test+${randomId}@example.com`);
      expect(user.emailConfirmationToken).toEqual(emailConfirmationToken);
    });
  });
});
