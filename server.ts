import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import fs from "fs";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getFirestore as getClientFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  limit, 
  orderBy,
  addDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from "firebase/firestore";

dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Initialize Client SDK for Firestore
const clientApp = initializeClientApp(firebaseConfig);
const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin for Auth (Bypassed to prevent GCP Metadata Server timeouts in restricted sandboxed runtimes)
/*
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  } catch (err) {
    console.error("Admin init failed:", err);
  }
}
*/

const JWT_SECRET = process.env.JWT_SECRET || "dte-telangana-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // --- Middleware ---

  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  const authorize = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }
      next();
    };
  };

  // --- Seed Logic ---
  async function seedDatabase() {
    if (!db) return;
    
    console.log("Testing Firestore connection with Client SDK...");
    try {
      const q = query(collection(db, "institutions"), limit(1));
      const snap = await getDocs(q);
      
      // Seed roles if empty
      const rolesQ = query(collection(db, "roles"), limit(1));
      const rolesSnap = await getDocs(rolesQ);
      if (rolesSnap.empty) {
        console.log("Seeding Roles collection...");
        const roles = [
          { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
          { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
          { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
          { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
          { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
          { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
        ];
        for (const role of roles) await setDoc(doc(db, "roles", role.id), role);
      }

      if (snap.empty || snap.size < 10) {
        console.log("Seeding institutions...");
        const institutions = [
          { id: "INST-HYD", name: "J.N. Government Polytechnic, Hyderabad", district: "Hyderabad", principalName: "Dr. P. Venugopal", staffStrength: 120, workingStrength: 105, vacancies: 15 },
          { id: "INST-WAR", name: "Government Polytechnic, Warangal", district: "Warangal", principalName: "Sri K. Ravinder", staffStrength: 85, workingStrength: 72, vacancies: 13 },
          { id: "INST-NIZ", name: "Government Polytechnic, Nizamabad", district: "Nizamabad", principalName: "Sri M. Muralidhar", staffStrength: 65, workingStrength: 58, vacancies: 7 },
          { id: "INST-KAR", name: "Government Polytechnic, Karimnagar", district: "Karimnagar", principalName: "Smt. G. Sarada", staffStrength: 70, workingStrength: 62, vacancies: 8 },
          { id: "INST-HYD-MASAB", name: "Government Polytechnic, Masab Tank, Hyderabad", district: "Hyderabad", principalName: "Dr. K. Rammohan", staffStrength: 110, workingStrength: 95, vacancies: 15 },
          { id: "INST-SEC-WOMEN", name: "Government Polytechnic for Women, Secunderabad", district: "Hyderabad", principalName: "Smt. K. Shanthi", staffStrength: 80, workingStrength: 70, vacancies: 10 },
          { id: "INST-NALG", name: "Government Polytechnic, Nalgonda", district: "Nalgonda", principalName: "Sri V. Prasad", staffStrength: 60, workingStrength: 52, vacancies: 8 },
          { id: "INST-KHAM", name: "Government Polytechnic, Khammam", district: "Khammam", principalName: "Dr. G. Ramesh", staffStrength: 75, workingStrength: 68, vacancies: 7 },
          { id: "INST-MAHA", name: "Government Polytechnic, Mahabubnagar", district: "Mahabubnagar", principalName: "Sri T. Srinivas", staffStrength: 80, workingStrength: 72, vacancies: 8 },
          { id: "INST-MEDK", name: "Government Polytechnic, Medak", district: "Medak", principalName: "Smt. P. Laxmi", staffStrength: 50, workingStrength: 45, vacancies: 5 },
          { id: "INST-SANG", name: "Government Polytechnic, Sangareddy", district: "Sangareddy", principalName: "Sri J. Kishan", staffStrength: 55, workingStrength: 48, vacancies: 7 },
          { id: "INST-SIDD", name: "Government Polytechnic, Siddipet", district: "Siddipet", principalName: "Dr. Ch. Srinivas Rao", staffStrength: 62, workingStrength: 55, vacancies: 7 },
          { id: "INST-VIKA", name: "Government Polytechnic, Vikarabad", district: "Vikarabad", principalName: "Sri G. Anjaneyulu", staffStrength: 45, workingStrength: 38, vacancies: 7 },
          { id: "INST-BELL", name: "Government Polytechnic, Bellampally", district: "Mancherial", principalName: "Sri M. Rajender", staffStrength: 40, workingStrength: 32, vacancies: 8 }
        ];
        for (const inst of institutions) await setDoc(doc(db, "institutions", inst.id), inst);
      }

      const userQ = query(collection(db, "users"), where("role", "==", "SUPER_ADMIN"), limit(1));
      const adminSnap = await getDocs(userQ);
      if (adminSnap.empty) {
        console.log("Seeding Roles and Users...");
        const hashedPassword = await bcrypt.hash("admin123", 4);
        
        const seedUsers = [
          {
            uid: "admin",
            username: "admin",
            email: "admin@dte.telangana.gov.in",
            displayName: "Super Admin",
            role: "SUPER_ADMIN",
            password: hashedPassword,
            disabled: false,
            createdAt: new Date().toISOString()
          },
          {
            uid: "cte_user",
            username: "cte_admin",
            email: "cte@dte.telangana.gov.in",
            displayName: "CTE Administrator",
            role: "CTE_ADMIN",
            password: hashedPassword,
            disabled: false,
            createdAt: new Date().toISOString()
          },
          {
            uid: "principal_hyd",
            username: "principal_hyd",
            email: "principal.hyd@gpt.telangana.gov.in",
            displayName: "Principal (GPT Hyderabad)",
            role: "PRINCIPAL",
            institutionId: "INST-HYD",
            password: hashedPassword,
            disabled: false,
            createdAt: new Date().toISOString()
          },
          {
            uid: "de_hyd",
            username: "de_hyd",
            email: "de.hyd@gpt.telangana.gov.in",
            displayName: "Data Entry (GPT Hyderabad)",
            role: "DATA_ENTRY",
            institutionId: "INST-HYD",
            password: hashedPassword,
            disabled: false,
            createdAt: new Date().toISOString()
          }
        ];

        for (const user of seedUsers) {
          await setDoc(doc(db, "users", user.uid), user);
        }
      }
      console.log("Seeding completed successfully");
    } catch (err: any) {
      console.error("Client SDK Firestore test failed:", err.message);
    }
  }

  // --- API Routes ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Employee Portal API is active" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const startTime = Date.now();
    console.log(`[AUTH LOGIN] Starting login attempt for user: "${username}"`);

    try {
      // Find user by username or email
      const queryStart = Date.now();
      const userQ = query(collection(db, "users"), where("username", "==", username), limit(1));
      let snapshot = await getDocs(userQ);
      
      if (snapshot.empty) {
        console.log(`[AUTH LOGIN] Username query was empty, trying email query for "${username}"`);
        const emailQ = query(collection(db, "users"), where("email", "==", username), limit(1));
        snapshot = await getDocs(emailQ);
      }
      console.log(`[AUTH LOGIN] Firestore query took ${Date.now() - queryStart}ms`);

      if (snapshot.empty) {
        console.log(`[AUTH LOGIN] No user found with username/email: "${username}" after ${Date.now() - startTime}ms`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      console.log(`[AUTH LOGIN] User document successfully retrieved: uid="${userData.uid}" role="${userData.role}"`);

      if (userData.disabled) {
        console.log(`[AUTH LOGIN] Login denied because account is disabled.`);
        return res.status(403).json({ error: "Account disabled" });
      }

      const bcryptStart = Date.now();
      console.log(`[AUTH LOGIN] Starting bcrypt comparison...`);
      const isMatch = await bcrypt.compare(password, userData.password);
      console.log(`[AUTH LOGIN] Bcrypt comparison completed in ${Date.now() - bcryptStart}ms. Match result: ${isMatch}`);

      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const { password: _, ...userSafeData } = userData;
      
      const token = jwt.sign({ 
        uid: userData.uid, 
        email: userData.email, 
        role: userData.role,
        institutionId: userData.institutionId
      }, JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      console.log(`[AUTH LOGIN] Successful login completed for user "${username}" in total ${Date.now() - startTime}ms`);
      res.json({ token, user: userSafeData });
    } catch (err) {
      console.error(`[AUTH LOGIN] ERROR during login attempt for "${username}":`, err);
      res.status(500).json({ error: "Auth failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/users", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const users = snapshot.docs.map(doc => {
        const { password, ...safeData } = doc.data() as any;
        return safeData;
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  app.get("/api/roles", authenticate, async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "roles"));
      let rolesList: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (rolesList.length === 0) {
        rolesList = [
          { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
          { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
          { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
          { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
          { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
          { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
        ];
      }
      res.json(rolesList);
    } catch (err) {
      const fallback: any[] = [
        { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
        { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
        { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
        { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
        { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
        { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
      ];
      res.json(fallback);
    }
  });

  app.get("/api/institutions", authenticate, async (req, res) => {
    try {
      const snapshot = await getDocs(query(collection(db, "institutions"), orderBy("name")));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch institutions" });
    }
  });

  app.post("/api/institutions", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const data = req.body;
      const id = data.id || `INST-${Date.now()}`;
      await setDoc(doc(db, "institutions", id), { ...data, id });
      res.json({ id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to create institution" });
    }
  });

  app.put("/api/employees/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await updateDoc(doc(db, "employees", id), { ...data, updatedAt: new Date().toISOString() });
      res.json({ id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req: any, res) => {
    const userinfo = req.user ? `[User: ${req.user.uid}, Role: ${req.user.role}]` : "[Unauthenticated]";
    console.log(`[DELETE /api/employees/${req.params.id}] Initiated by ${userinfo}`);
    try {
      const { id } = req.params;
      await deleteDoc(doc(db, "employees", id));
      console.log(`[DELETE /api/employees/${id}] Successfully deleted employee document.`);
      res.json({ message: "Employee deleted" });
    } catch (err) {
      console.error(`[DELETE /api/employees/${req.params.id}] ERROR:`, err);
      res.status(500).json({ error: "Failed to delete employee: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.put("/api/institutions/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await updateDoc(doc(db, "institutions", id), data);
      res.json({ id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to update institution" });
    }
  });

  app.delete("/api/institutions/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    const userinfo = req.user ? `[User: ${req.user.uid}, Role: ${req.user.role}]` : "[Unauthenticated]";
    console.log(`[DELETE /api/institutions/${req.params.id}] Initiated by ${userinfo}`);
    try {
      const { id } = req.params;
      await deleteDoc(doc(db, "institutions", id));
      console.log(`[DELETE /api/institutions/${id}] Successfully deleted institution.`);
      res.json({ message: "Institution deleted" });
    } catch (err) {
      console.error(`[DELETE /api/institutions/${req.params.id}] ERROR:`, err);
      res.status(500).json({ error: "Failed to delete institution: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/users", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    console.log("POST /api/users received with body:", { ...req.body, password: "[REDACTED]" });
    try {
      const { username, password, email, displayName, role, institutionId } = req.body;
      
      if (!username || !password || !email || !displayName || !role) {
        console.log("Missing required fields for user creation");
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user exists
      console.log("Checking if user already exists:", username);
      const existingQ = query(collection(db, "users"), where("username", "==", username), limit(1));
      const existing = await getDocs(existingQ);
      if (!existing.empty) {
        console.log("User already exists:", username);
        return res.status(400).json({ error: "Username already exists" });
      }

      console.log("Hashing password for:", username);
      const hashedPassword = await bcrypt.hash(password, 4);
      const uid = `user_${Date.now()}`;
      
      const newUser = {
        uid,
        username,
        email,
        displayName,
        role,
        institutionId: institutionId || null,
        password: hashedPassword,
        disabled: false,
        createdAt: new Date().toISOString()
      };

      console.log("Saving new user to Firestore with UID:", uid);
      await setDoc(doc(db, "users", uid), newUser);
      
      // Audit log entry
      try {
        await addDoc(collection(db, "auditLogs"), {
          userEmail: req.user.email,
          action: "CREATE_USER",
          entity: "User",
          entityId: uid,
          details: `Created new user: ${username} (${role})`,
          timestamp: new Date().toISOString()
        });
      } catch (auditErr) {
        console.error("Failed to create audit log for user creation:", auditErr);
      }

      const { password: _, ...safeUser } = newUser;
      console.log("User created successfully:", username);
      res.json(safeUser);
    } catch (err: any) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: "Failed to create user: " + err.message });
    }
  });

  app.put("/api/users/:uid", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const { uid } = req.params;
      const { password, ...updateData } = req.body;
      
      if (password) {
        updateData.password = await bcrypt.hash(password, 4);
      }
      
      await updateDoc(doc(db, "users", uid), updateData);
      res.json({ message: "User updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/employees", authenticate, async (req: any, res) => {
    try {
      let q;
      if (req.user.role === "PRINCIPAL" && req.user.institutionId) {
        q = query(collection(db, "employees"), where("institutionId", "==", req.user.institutionId), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "employees"), orderBy("createdAt", "desc"));
      }
      const snapshot = await getDocs(q);
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req, res) => {
    try {
      const data = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, "employees"), data);
      res.json({ id: docRef.id, ...data });
    } catch (err) {
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.get("/api/reports", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "AUDITOR"]), async (req, res) => {
    res.json({ totalEmployees: 1482, byGender: { male: 850, female: 632 } });
  });

  app.get("/api/logs", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(100));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Seed DB in background
  seedDatabase().catch(err => console.error("Seeding failed:", err));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
}

startServer();
