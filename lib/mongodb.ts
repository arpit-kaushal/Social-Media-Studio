import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

const getConnectionString = (): string => {
  const explicit = process.env.MONGODB_URI?.trim();
  if (explicit) return explicit;

  const authUser = process.env.DB_USERNAME;
  const authPass = process.env.DB_PASSWORD;
  const cluster = process.env.DB_CLUSTER?.trim();
  const dbName = process.env.DB_NAME?.trim();

  if (!authUser || !authPass || !cluster || !dbName) {
    throw new Error(
      "Missing MongoDB environment variables: DB_USERNAME, DB_PASSWORD, DB_CLUSTER, DB_NAME (or set MONGODB_URI)"
    );
  }

  const encodedUser = encodeURIComponent(authUser);
  const encodedPass = encodeURIComponent(authPass);

  return `mongodb+srv://${encodedUser}:${encodedPass}@${cluster}.s7w4ras.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${cluster}`;
};

export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  const uri = getConnectionString();
  client = new MongoClient(uri);
  await client.connect();
  const name = process.env.DB_NAME?.trim();
  if (!name) throw new Error("DB_NAME required");
  db = client.db(name);
  return db;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
