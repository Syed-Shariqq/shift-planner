import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5000"],
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`Shift Planner server listening on port ${port}`);
});
