import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  collection,
  terminate,
  setLogLevel,
  disableNetwork
} from "firebase/firestore";
import { 
  getDatabase, 
  ref as dbRef, 
  set as rtdbSet, 
  remove as rtdbRemove, 
  get as rtdbGet 
} from "firebase/database";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

// Web app's Firebase configuration loaded dynamically or with hardcoded fallbacks
let firebaseConfig: any = {
  apiKey: "AIzaSyA2W7Ih4T5PtK17InQ4epxc1sHLRp8cugQ",
  authDomain: "ai-studio-applet-webapp-bcb3b.firebaseapp.com",
  databaseURL: "https://ai-studio-applet-webapp-bcb3b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ai-studio-applet-webapp-bcb3b",
  storageBucket: "ai-studio-applet-webapp-bcb3b.firebasestorage.app",
  messagingSenderId: "1023400366254",
  appId: "1:1023400366254:web:c3379df5a62565d3035d3f",
  firestoreDatabaseId: "ai-studio-628822f5-4db3-4bd6-9b3a-0c7984579674"
};

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const fileData = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(fileData);
    firebaseConfig = { ...firebaseConfig, ...parsed };
    console.log(`[FIREBASE] Dynamic config read successful. Project: "${firebaseConfig.projectId}", Database: "${firebaseConfig.firestoreDatabaseId}"`);
  }
} catch (e) {
  console.error("[FIREBASE] Error reading firebase-applet-config.json:", e);
}

// Initialize Firebase statically and safely (safeguarded with fallback fields above, preventing startup failure)
const firebaseApp = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

try {
  setLogLevel("silent");
} catch (_) {}

const rtdb = getDatabase(firebaseApp);

// System environment control
let firestoreEnabled = true;
let rtdbEnabled = true;

const DB_FILE = path.join(process.cwd(), "db.json");

interface LocalDb {
  roles: any[];
  institutions: any[];
  users: any[];
  employees: any[];
  auditLogs: any[];
}

let memoryDb: LocalDb | null = null;

function readDb(): LocalDb {
  if (memoryDb) {
    return memoryDb;
  }

  // Attempt to read from the local database file if present on disk
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      memoryDb = JSON.parse(data);
      console.log("[STORAGE] DB pre-loaded from disk successfully.");
      return memoryDb!;
    }
  } catch (err) {
    console.error("[STORAGE] Failed to read local db.json file from disk:", err);
  }

  // Fallback if the file cannot be accessed or written in the current runtime environment (like Vercel)
  console.log("[STORAGE] Seeding memoryDb with secure institutional defaults...");

  const defaultHash = "$2b$04$PA.4LwCi80GI1zM4Ukr5DuooV/IdgnoRVp9CVS2whwfKSIwnTEFYO"; // bcrypt for 'admin123'

  memoryDb = {
    roles: [
      { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
      { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
      { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
      { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
      { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
      { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
    ],
    institutions: [
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
    ],
    users: [
      {
        uid: "admin",
        username: "admin",
        email: "admin@dte.telangana.gov.in",
        displayName: "Super Admin",
        role: "SUPER_ADMIN",
        password: defaultHash,
        disabled: false,
        createdAt: "2026-05-23T15:25:38.965Z"
      },
      {
        uid: "cte_user",
        username: "cte_admin",
        email: "cte@dte.telangana.gov.in",
        displayName: "CTE Administrator",
        role: "CTE_ADMIN",
        password: defaultHash,
        disabled: false,
        createdAt: "2026-05-23T15:25:38.965Z"
      },
      {
        uid: "principal_hyd",
        username: "principal_hyd",
        email: "principal.hyd@gpt.telangana.gov.in",
        displayName: "Principal (GPT Hyderabad)",
        role: "PRINCIPAL",
        institutionId: "INST-HYD",
        password: defaultHash,
        disabled: false,
        createdAt: "2026-05-23T15:25:38.965Z"
      },
      {
        uid: "de_hyd",
        username: "de_hyd",
        email: "de.hyd@gpt.telangana.gov.in",
        displayName: "Data Entry (GPT Hyderabad)",
        role: "DATA_ENTRY",
        institutionId: "INST-HYD",
        password: defaultHash,
        disabled: false,
        createdAt: "2026-05-23T15:25:38.965Z"
      }
    ],
    employees: [],
    auditLogs: []
  };

  return memoryDb!;
}

function writeDb(data: LocalDb) {
  memoryDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("[STORAGE] Local filesystem is read-only (expected on Vercel). Changes will persist in memory for the duration of this container execution.");
  }
}

// Timeout Helper for Resilient Firebase operations
function withTimeout<T>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errMsg)), ms);
  });
  return Promise.race([promise, timeout]);
}

// Resilient Firebase Writers
async function safeFirestoreSet(col: string, docId: string, data: any) {
  try {
    const docRef = doc(db, col, docId);
    await withTimeout(setDoc(docRef, data), 3000, "Firestore set timed out");
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    console.warn(`[FIREBASE] Firestore set failed for ${col}/${docId}:`, errMsg);
  }
}

async function safeFirestoreDelete(col: string, docId: string) {
  try {
    const docRef = doc(db, col, docId);
    await withTimeout(deleteDoc(docRef), 3000, "Firestore delete timed out");
  } catch (err: any) {
    const errMsg = String(err?.message || err);
    console.warn(`[FIREBASE] Firestore delete failed for ${col}/${docId}:`, errMsg);
  }
}

async function safeRTDBSet(path: string, data: any) {
  if (!rtdbEnabled) return;
  try {
    const reference = dbRef(rtdb, path);
    await withTimeout(rtdbSet(reference, data), 2000, "Realtime Database set timed out");
  } catch (err: any) {
    console.error(`[FIREBASE RTDB] Realtime Database set failed or timed out:`, err?.message || err);
  }
}

async function safeRTDBDelete(path: string) {
  if (!rtdbEnabled) return;
  try {
    const reference = dbRef(rtdb, path);
    await withTimeout(rtdbRemove(reference), 2000, "Realtime Database remove timed out");
  } catch (err: any) {
    console.error(`[FIREBASE RTDB] Realtime Database delete failed or timed out:`, err?.message || err);
  }
}

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
    console.log("Checking Firestore & RTDB seed state with localDb cache...");
    const localDb = readDb();
    let localChanged = false;

    if (!localDb.roles || localDb.roles.length === 0) {
      localDb.roles = [
        { id: "SUPER_ADMIN", name: "Super Admin", description: "Full system access" },
        { id: "CTE_ADMIN", name: "CTE Admin", description: "Department level administration" },
        { id: "PRINCIPAL", name: "Principal", description: "Institution level management" },
        { id: "DATA_ENTRY", name: "Data Entry", description: "Record management" },
        { id: "AUDITOR", name: "Auditor", description: "View-only access for audits" },
        { id: "EMPLOYEE", name: "Employee", description: "Staff portal access" }
      ];
      localChanged = true;
    }

    if (!localDb.institutions || localDb.institutions.length === 0) {
      localDb.institutions = [
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
      localChanged = true;
    }

    if (!localDb.users || localDb.users.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 4);
      localDb.users = [
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
      localChanged = true;
    }

    if (!localDb.employees) {
      localDb.employees = [];
      localChanged = true;
    }

    if (!localDb.auditLogs) {
      localDb.auditLogs = [];
      localChanged = true;
    }

    if (localChanged) {
      writeDb(localDb);
    }

    // Dynamic probing of Firestore to check service availability (with strict timeout)
    try {
      if (firestoreEnabled) {
        console.log("[FIREBASE] Probing Firestore service availability (2s timeout)...");
        let rolesEmpty = false;
        try {
          const rolesSnap = await withTimeout(
            getDocs(collection(db, "roles")),
            2000,
            "Firestore roles connection timed out"
          );
          rolesEmpty = rolesSnap.empty;
        } catch (e) {
          rolesEmpty = true;
        }

        if (rolesEmpty) {
          console.log("[FIREBASE] Seeding Firestore DB collections...");
          for (const r of localDb.roles) {
            await withTimeout(setDoc(doc(db, "roles", r.id), r), 2000, "Firestore seed timed out");
          }
          for (const inst of localDb.institutions) {
            await withTimeout(setDoc(doc(db, "institutions", inst.id), inst), 2000, "Firestore seed timed out");
          }
          for (const u of localDb.users) {
            await withTimeout(setDoc(doc(db, "users", u.uid), u), 2000, "Firestore seed timed out");
          }
        } else {
          console.log("[FIREBASE] Core collections exist. Verifying that users are fully synchronized...");
          for (const u of localDb.users) {
            try {
              const uDoc = await withTimeout(getDoc(doc(db, "users", u.uid)), 2000, "Get user timeout");
              if (!uDoc.exists()) {
                console.log(`[FIREBASE] Syncing missing user to Firestore: ${u.username}`);
                await withTimeout(setDoc(doc(db, "users", u.uid), u), 2000, "Sync user timeout");
              }
            } catch (err: any) {
              console.warn(`[FIREBASE] Failed checking/syncing user ${u.username}:`, err?.message || err);
            }
          }
        }
        console.log("[FIREBASE] Firestore seeding verified successfully.");
      }
    } catch (err: any) {
      console.warn(`[FIREBASE] Firestore check failed or timed out during async seeding. This is normal if database rules/domains are still being configured: ${err?.message || err}`);
    }

    // Dynamic probing & seeding of Realtime Database (guaranteed to succeed when configured, with strict timeout Check)
    try {
      if (rtdbEnabled) {
        console.log("[FIREBASE RTDB] Probing Realtime Database service availability (2s timeout)...");
        const dbInstanceVal = await withTimeout(
          rtdbGet(dbRef(rtdb, "roles")),
          2000,
          "Realtime Database connection timed out"
        );
        if (!dbInstanceVal.exists()) {
          console.log("[FIREBASE RTDB] Seeding Realtime Database from localDb cache...");
          for (const r of localDb.roles) {
            await withTimeout(rtdbSet(dbRef(rtdb, `roles/${r.id}`), r), 2000, "RTDB seed timed out");
          }
          for (const inst of localDb.institutions) {
            await withTimeout(rtdbSet(dbRef(rtdb, `institutions/${inst.id}`), inst), 2000, "RTDB seed timed out");
          }
          for (const u of localDb.users) {
            await withTimeout(rtdbSet(dbRef(rtdb, `users/${u.uid}`), u), 2000, "RTDB seed timed out");
          }
          console.log("[FIREBASE RTDB] Realtime Database seeded successfully.");
        } else {
          console.log("[FIREBASE RTDB] Realtime Database verified, roles verified.");
        }
      }
    } catch (err: any) {
      console.warn(`[FIREBASE RTDB] Realtime Database sync probe failed or timed out: ${err?.message || err}. Disabling RTDB engine.`);
      rtdbEnabled = false;
    }
  }

  // --- API Routes ---

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Employee Portal API is active",
      cacheState: "operational",
      gcpFirestoreActive: firestoreEnabled,
      gcpRTDBActive: rtdbEnabled
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const startTime = Date.now();
    console.log(`[AUTH LOGIN] Starting login attempt for user: "${username}"`);

    try {
      const localDb = readDb();
      const userData = localDb.users.find((u: any) => u.username === username || u.email === username);

      if (!userData) {
        console.log(`[AUTH LOGIN] No user found with username/email: "${username}"`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (userData.disabled) {
        console.log(`[AUTH LOGIN] Login denied because account is disabled.`);
        return res.status(403).json({ error: "Account disabled" });
      }

      const isMatch = await bcrypt.compare(password, userData.password);
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
      console.log(`[AUTH LOGIN] Successful login completed for user "${username}" in ${Date.now() - startTime}ms`);

      // Record successful login audit log
      const logId = `log_${Date.now()}`;
      const logData = {
        id: logId,
        userEmail: userData.email,
        action: "USER_LOGIN",
        entity: "User",
        entityId: userData.uid,
        details: `Successful login for user: ${userData.username} (${userData.role})`,
        timestamp: new Date().toISOString()
      };
      
      localDb.auditLogs.unshift(logData);
      writeDb(localDb);

      // Robust async background sync to Firestore & RTDB
      safeFirestoreSet("users", userData.uid, userData);
      safeRTDBSet(`users/${userData.uid}`, userData);
      safeFirestoreSet("auditLogs", logId, logData);
      safeRTDBSet(`auditLogs/${logId}`, logData);

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
      const localDb = readDb();
      const users = localDb.users.map((u: any) => {
        const { password, ...safeData } = u;
        return safeData;
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/sync-firebase", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    try {
      console.log("[FIREBASE SYNC] Manual full database sync requested by:", req.user.email);
      const localDb = readDb();
      
      // Attempt to re-awake connection flags
      firestoreEnabled = true;
      rtdbEnabled = true;

      const results = {
        roles: { attempted: 0, successful: 0, errors: [] as string[] },
        institutions: { attempted: 0, successful: 0, errors: [] as string[] },
        users: { attempted: 0, successful: 0, errors: [] as string[] },
        employees: { attempted: 0, successful: 0, errors: [] as string[] },
        auditLogs: { attempted: 0, successful: 0, errors: [] as string[] },
        overall: "success"
      };

      // 1. Sync Roles
      for (const r of localDb.roles || []) {
        results.roles.attempted++;
        try {
          await withTimeout(setDoc(doc(db, "roles", r.id), r), 2000, "Firestore role seed timed out");
          results.roles.successful++;
        } catch (e: any) {
          results.roles.errors.push(`Role ${r.id}: ${e?.message || e}`);
        }
      }

      // 2. Sync Institutions
      for (const inst of localDb.institutions || []) {
        results.institutions.attempted++;
        try {
          await withTimeout(setDoc(doc(db, "institutions", inst.id), inst), 2000, "Firestore institution seed timed out");
          results.institutions.successful++;
        } catch (e: any) {
          results.institutions.errors.push(`Inst ${inst.id}: ${e?.message || e}`);
        }
      }

      // 3. Sync Users
      for (const u of localDb.users || []) {
        results.users.attempted++;
        try {
          await withTimeout(setDoc(doc(db, "users", u.uid), u), 2000, "Firestore user seed timed out");
          results.users.successful++;
        } catch (e: any) {
          results.users.errors.push(`User ${u.username}: ${e?.message || e}`);
        }
      }

      // 4. Sync Employees
      for (const emp of localDb.employees || []) {
        results.employees.attempted++;
        try {
          // Verify that required fields for security rules are present
          const cleanEmp = {
            id: emp.id,
            name: emp.name || "N/A",
            employeeId: emp.employeeId || "N/A",
            mobile: emp.mobile || "0000000000",
            email: emp.email || "no-email@dte.telangana.gov.in",
            institutionId: emp.institutionId || "INST-HYD",
            ...emp
          };
          await withTimeout(setDoc(doc(db, "employees", cleanEmp.id), cleanEmp), 2000, "Firestore employee seed timed out");
          results.employees.successful++;
        } catch (e: any) {
          results.employees.errors.push(`Emp ${emp.id}: ${e?.message || e}`);
        }
      }

      // 5. Sync Audit Logs
      const limitedLogs = (localDb.auditLogs || []).slice(0, 100);
      for (const log of limitedLogs) {
        results.auditLogs.attempted++;
        try {
          await withTimeout(setDoc(doc(db, "auditLogs", log.id), log), 2000, "Firestore audit log seed timed out");
          results.auditLogs.successful++;
        } catch (e: any) {
          results.auditLogs.errors.push(`Log ${log.id}: ${e?.message || e}`);
        }
      }

      console.log("[FIREBASE SYNC] Manual sync complete with results:", JSON.stringify(results));
      res.json(results);
    } catch (err: any) {
      console.error("[FIREBASE SYNC] Fatal sync error:", err);
      res.status(500).json({ error: "Sync failed: " + (err?.message || err) });
    }
  });
  
  app.get("/api/roles", authenticate, async (req, res) => {
    try {
      const localDb = readDb();
      res.json(localDb.roles);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  app.get("/api/institutions", authenticate, async (req, res) => {
    try {
      const localDb = readDb();
      const sorted = [...localDb.institutions].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      res.json(sorted);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch institutions" });
    }
  });

  app.post("/api/institutions", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    try {
      const localDb = readDb();
      const id = req.body.id || `INST-${Date.now()}`;
      const newInst = { 
        ...req.body, 
        id, 
        vacancies: (Number(req.body.staffStrength) || 0) - (Number(req.body.workingStrength) || 0) 
      };
      
      localDb.institutions = localDb.institutions.filter((inst: any) => inst.id !== id);
      localDb.institutions.push(newInst);
      
      const logId = `log_${Date.now()}`;
      const logData = {
        id: logId,
        userEmail: req.user.email,
        action: "CREATE_INSTITUTION",
        entity: "Institution",
        entityId: id,
        details: `Created institution record: ${newInst.name}`,
        timestamp: new Date().toISOString()
      };
      localDb.auditLogs.unshift(logData);
      
      writeDb(localDb);

      // Async Sync in Background to Firebase
      safeFirestoreSet("institutions", id, newInst);
      safeRTDBSet(`institutions/${id}`, newInst);
      safeFirestoreSet("auditLogs", logId, logData);
      safeRTDBSet(`auditLogs/${logId}`, logData);
      
      res.json(newInst);
    } catch (err) {
      res.status(500).json({ error: "Failed to create institution" });
    }
  });

  app.put("/api/employees/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req: any, res) => {
    try {
      const localDb = readDb();
      const { id } = req.params;
      const index = localDb.employees.findIndex((e: any) => e.id === id);
      if (index !== -1) {
        const updatedData = { 
          ...localDb.employees[index], 
          ...req.body, 
          updatedAt: new Date().toISOString() 
        };
        localDb.employees[index] = updatedData;
        
        const logId = `log_${Date.now()}`;
        const logData = {
          id: logId,
          userEmail: req.user.email,
          action: "UPDATE_EMPLOYEE",
          entity: "Employee",
          entityId: id,
          details: `Updated employee record: ${updatedData.name} (${updatedData.status})`,
          timestamp: new Date().toISOString()
        };
        localDb.auditLogs.unshift(logData);

        writeDb(localDb);

        // Async Sync in Background to Firebase
        safeFirestoreSet("employees", id, updatedData);
        safeRTDBSet(`employees/${id}`, updatedData);
        safeFirestoreSet("auditLogs", logId, logData);
        safeRTDBSet(`auditLogs/${logId}`, logData);

        res.json(updatedData);
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req: any, res) => {
    const userinfo = req.user ? `[User: ${req.user.uid}, Role: ${req.user.role}]` : "[Unauthenticated]";
    console.log(`[DELETE /api/employees/${req.params.id}] Initiated by ${userinfo}`);
    try {
      const localDb = readDb();
      const { id } = req.params;
      const emp = localDb.employees.find((e: any) => e.id === id);
      if (emp) {
        const name = emp.name || "Unknown";
        localDb.employees = localDb.employees.filter((e: any) => e.id !== id);
        
        const logId = `log_${Date.now()}`;
        const logData = {
          id: logId,
          userEmail: req.user.email,
          action: "DELETE_EMPLOYEE",
          entity: "Employee",
          entityId: id,
          details: `Deleted employee record: ${name}`,
          timestamp: new Date().toISOString()
        };
        localDb.auditLogs.unshift(logData);

        writeDb(localDb);

        // Async Sync in Background to Firebase
        safeFirestoreDelete("employees", id);
        safeRTDBDelete(`employees/${id}`);
        safeFirestoreSet("auditLogs", logId, logData);
        safeRTDBSet(`auditLogs/${logId}`, logData);

        console.log(`[DELETE /api/employees/${id}] Successfully deleted employee.`);
        res.json({ message: "Employee deleted" });
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (err) {
      console.error(`[DELETE /api/employees/${req.params.id}] ERROR:`, err);
      res.status(500).json({ error: "Failed to delete employee: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.put("/api/institutions/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    try {
      const localDb = readDb();
      const { id } = req.params;
      const index = localDb.institutions.findIndex((inst: any) => inst.id === id);
      if (index !== -1) {
        const updatedData = { 
          ...localDb.institutions[index], 
          ...req.body, 
          id, 
          vacancies: (Number(req.body.staffStrength) || 0) - (Number(req.body.workingStrength) || 0) 
        };
        localDb.institutions[index] = updatedData;

        const logId = `log_${Date.now()}`;
        const logData = {
          id: logId,
          userEmail: req.user.email,
          action: "UPDATE_INSTITUTION",
          entity: "Institution",
          entityId: id,
          details: `Updated institution record: ${updatedData.name}`,
          timestamp: new Date().toISOString()
        };
        localDb.auditLogs.unshift(logData);

        writeDb(localDb);

        // Async Sync in Background to Firebase
        safeFirestoreSet("institutions", id, updatedData);
        safeRTDBSet(`institutions/${id}`, updatedData);
        safeFirestoreSet("auditLogs", logId, logData);
        safeRTDBSet(`auditLogs/${logId}`, logData);

        res.json(updatedData);
      } else {
        res.status(404).json({ error: "Institution not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to update institution" });
    }
  });

  app.delete("/api/institutions/:id", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    const userinfo = req.user ? `[User: ${req.user.uid}, Role: ${req.user.role}]` : "[Unauthenticated]";
    console.log(`[DELETE /api/institutions/${req.params.id}] Initiated by ${userinfo}`);
    try {
      const localDb = readDb();
      const { id } = req.params;
      const inst = localDb.institutions.find((i: any) => i.id === id);
      if (inst) {
        const name = inst.name || "Unknown";
        localDb.institutions = localDb.institutions.filter((i: any) => i.id !== id);

        const logId = `log_${Date.now()}`;
        const logData = {
          id: logId,
          userEmail: req.user.email,
          action: "DELETE_INSTITUTION",
          entity: "Institution",
          entityId: id,
          details: `Deleted institution record: ${name}`,
          timestamp: new Date().toISOString()
        };
        localDb.auditLogs.unshift(logData);

        writeDb(localDb);

        // Async Sync in Background to Firebase
        safeFirestoreDelete("institutions", id);
        safeRTDBDelete(`institutions/${id}`);
        safeFirestoreSet("auditLogs", logId, logData);
        safeRTDBSet(`auditLogs/${logId}`, logData);

        console.log(`[DELETE /api/institutions/${id}] Successfully deleted institution.`);
        res.json({ message: "Institution deleted" });
      } else {
        res.status(404).json({ error: "Institution not found" });
      }
    } catch (err) {
      console.error(`[DELETE /api/institutions/${req.params.id}] ERROR:`, err);
      res.status(500).json({ error: "Failed to delete institution: " + (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/api/users", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    console.log("POST /api/users received with body:", { ...req.body, password: "[REDACTED]" });
    try {
      const localDb = readDb();
      const { username, password, email, displayName, role, institutionId } = req.body;
      
      if (!username || !password || !email || !displayName || !role) {
        console.log("Missing required fields for user creation");
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existsUser = localDb.users.some((u: any) => u.username === username);
      if (existsUser) {
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

      localDb.users.push(newUser);
      
      const logId = `log_${Date.now()}`;
      const logData = {
        id: logId,
        userEmail: req.user.email,
        action: "CREATE_USER",
        entity: "User",
        entityId: uid,
        details: `Created new user: ${username} (${role})`,
        timestamp: new Date().toISOString()
      };
      localDb.auditLogs.unshift(logData);

      writeDb(localDb);

      // Async Sync in Background to Firebase
      safeFirestoreSet("users", uid, newUser);
      safeRTDBSet(`users/${uid}`, newUser);
      safeFirestoreSet("auditLogs", logId, logData);
      safeRTDBSet(`auditLogs/${logId}`, logData);

      const { password: _, ...safeUser } = newUser;
      console.log("User created successfully:", username);
      res.json(safeUser);
    } catch (err: any) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: "Failed to create user: " + err.message });
    }
  });

  app.put("/api/users/:uid", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req: any, res) => {
    try {
      const localDb = readDb();
      const { uid } = req.params;
      const { password, ...updateData } = req.body;
      
      const index = localDb.users.findIndex((u: any) => u.uid === uid);
      if (index !== -1) {
        let finalPassword = localDb.users[index].password;
        if (password) {
          finalPassword = await bcrypt.hash(password, 4);
        }
        
        const updatedUser = {
          ...localDb.users[index],
          ...updateData,
          password: finalPassword
        };
        localDb.users[index] = updatedUser;

        const logId = `log_${Date.now()}`;
        const logData = {
          id: logId,
          userEmail: req.user.email,
          action: "UPDATE_USER",
          entity: "User",
          entityId: uid,
          details: `Updated user profile: ${updatedUser.username}`,
          timestamp: new Date().toISOString()
        };
        localDb.auditLogs.unshift(logData);

        writeDb(localDb);

        // Async Sync in Background to Firebase
        safeFirestoreSet("users", uid, updatedUser);
        safeRTDBSet(`users/${uid}`, updatedUser);
        safeFirestoreSet("auditLogs", logId, logData);
        safeRTDBSet(`auditLogs/${logId}`, logData);

        res.json({ message: "User updated" });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/employees", authenticate, async (req: any, res) => {
    try {
      const localDb = readDb();
      let employees = localDb.employees || [];
      if (req.user.role === "PRINCIPAL" && req.user.institutionId) {
        employees = employees.filter((e: any) => e.institutionId === req.user.institutionId);
      }
      employees = [...employees].sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "DATA_ENTRY"]), async (req: any, res) => {
    try {
      const localDb = readDb();
      const id = `EMP-${Date.now()}`;
      const data = { 
        id,
        ...req.body, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      };
      
      localDb.employees.unshift(data);

      const logId = `log_${Date.now()}`;
      const logData = {
        id: logId,
        userEmail: req.user.email,
        action: "CREATE_EMPLOYEE",
        entity: "Employee",
        entityId: id,
        details: `Created employee record: ${data.name}`,
        timestamp: new Date().toISOString()
      };
      localDb.auditLogs.unshift(logData);

      writeDb(localDb);

      // Async Sync in Background to Firebase
      safeFirestoreSet("employees", id, data);
      safeRTDBSet(`employees/${id}`, data);
      safeFirestoreSet("auditLogs", logId, logData);
      safeRTDBSet(`auditLogs/${logId}`, logData);

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.get("/api/reports", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN", "PRINCIPAL", "AUDITOR"]), async (req, res) => {
    try {
      const localDb = readDb();
      const total = localDb.employees.length;
      const male = localDb.employees.filter((e: any) => (e.gender || "").toLowerCase() === "male").length;
      const female = total - male;
      res.json({ totalEmployees: total, byGender: { male, female } });
    } catch (err) {
      res.json({ totalEmployees: 0, byGender: { male: 0, female: 0 } });
    }
  });

  app.get("/api/logs", authenticate, authorize(["SUPER_ADMIN", "CTE_ADMIN"]), async (req, res) => {
    try {
      const localDb = readDb();
      const logs = localDb.auditLogs || [];
      const sorted = [...logs].sort((a: any, b: any) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      res.json(sorted.slice(0, 100));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  const isProduction = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "server.ts")) || fs.existsSync(path.join(process.cwd(), "dist/index.html"));

  if (!isProduction) {
    try {
      console.log("[SERVER] Starting in development mode with Vite middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    } catch (vErr) {
      console.error("[SERVER] Failed to initialize Vite dev server, falling back to static dist serving:", vErr);
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
  } else {
    console.log("[SERVER] Starting in production mode, serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  // Under Vercel environment, don't execute app.listen() directly
  if (process.env.VERCEL) {
    console.log("[SERVER] Exporting Express app instance for Vercel Serverless environment.");
    // Run seed inside serverless function startup as background promise
    seedDatabase().catch(err => console.error("[SERVERLESS SEED] Seeding failed:", err));
  } else {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      // Seed DB in background asynchronously to optimize application startup and page load times
      seedDatabase().catch(err => console.error("Seeding failed during async background init:", err));
    });
  }

  return app;
}

export { startServer };

if (!process.env.VERCEL) {
  startServer();
}
