/**
 * ============================================
 * FIREBASE CONFIGURATION
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    increment,
    arrayUnion,
    arrayRemove,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============================================
// FIREBASE CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ============================================
// COLLECTION REFERENCES
// ============================================
const COLLECTIONS = {
    AGENTS: 'agents',
    POLLING_UNITS: 'polling_units',
    RESULTS: 'results',
    LGAS: 'lgas',
    WARDS: 'wards',
    SUBMISSIONS: 'submissions',
    AUDIT_LOGS: 'audit_logs',
    NOTIFICATIONS: 'notifications'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID
 */
function generateId() {
    return doc(collection(db, 'temp')).id;
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
    return serverTimestamp();
}

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Register new agent
 */
async function registerAgent(email, password, userData) {
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile
        await updateProfile(user, {
            displayName: `${userData.firstName} ${userData.lastName}`
        });
        
        // Send email verification
        await sendEmailVerification(user);
        
        // Save agent data to Firestore
        const agentData = {
            uid: user.uid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: email,
            phone: userData.phone,
            pollingUnitUID: userData.pollingUnitUID.toUpperCase(),
            lga: userData.lga || '',
            ward: userData.ward || '',
            registeredVoters: userData.registeredVoters || 0,
            isVerified: false,
            isActive: true,
            role: 'agent',
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            lastLogin: null,
            profileImage: '',
            deviceInfo: userData.deviceInfo || {}
        };
        
        await setDoc(doc(db, COLLECTIONS.AGENTS, user.uid), agentData);
        
        // Create submission history subcollection
        await setDoc(doc(db, COLLECTIONS.AGENTS, user.uid, 'history', 'stats'), {
            totalSubmissions: 0,
            lastSubmission: null,
            createdAt: getCurrentTimestamp()
        });
        
        return {
            success: true,
            user: user,
            uid: user.uid,
            message: 'Registration successful! Please verify your email.'
        };
        
    } catch (error) {
        console.error('Registration error:', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

/**
 * Login agent
 */
async function loginAgent(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update last login
        await updateDoc(doc(db, COLLECTIONS.AGENTS, user.uid), {
            lastLogin: getCurrentTimestamp()
        });
        
        // Get agent data
        const agentDoc = await getDoc(doc(db, COLLECTIONS.AGENTS, user.uid));
        const agentData = agentDoc.exists() ? agentDoc.data() : null;
        
        return {
            success: true,
            user: user,
            agentData: agentData,
            uid: user.uid
        };
        
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    }
}

/**
 * Logout agent
 */
async function logoutAgent() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get current user
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Check auth state
 */
function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// ============================================
// AGENT FUNCTIONS
// ============================================

/**
 * Get agent data by UID
 */
async function getAgentData(uid) {
    try {
        const docRef = doc(db, COLLECTIONS.AGENTS, uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                success: true,
                data: docSnap.data()
            };
        } else {
            return {
                success: false,
                error: 'Agent not found'
            };
        }
    } catch (error) {
        console.error('Error fetching agent:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all agents (Admin only)
 */
async function getAllAgents() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.AGENTS));
        const agents = [];
        querySnapshot.forEach((doc) => {
            agents.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: agents
        };
    } catch (error) {
        console.error('Error fetching agents:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update agent data
 */
async function updateAgentData(uid, data) {
    try {
        await updateDoc(doc(db, COLLECTIONS.AGENTS, uid), {
            ...data,
            updatedAt: getCurrentTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating agent:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verify agent
 */
async function verifyAgent(uid) {
    return await updateAgentData(uid, { isVerified: true });
}

// ============================================
// POLLING UNIT FUNCTIONS
// ============================================

/**
 * Get polling unit by UID
 */
async function getPollingUnit(uid) {
    try {
        const docRef = doc(db, COLLECTIONS.POLLING_UNITS, uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                success: true,
                data: docSnap.data()
            };
        } else {
            return {
                success: false,
                error: 'Polling unit not found'
            };
        }
    } catch (error) {
        console.error('Error fetching polling unit:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all polling units by LGA
 */
async function getPollingUnitsByLGA(lga) {
    try {
        const q = query(
            collection(db, COLLECTIONS.POLLING_UNITS),
            where('lga', '==', lga)
        );
        const querySnapshot = await getDocs(q);
        const units = [];
        querySnapshot.forEach((doc) => {
            units.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: units
        };
    } catch (error) {
        console.error('Error fetching polling units:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all polling units
 */
async function getAllPollingUnits() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.POLLING_UNITS));
        const units = [];
        querySnapshot.forEach((doc) => {
            units.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: units
        };
    } catch (error) {
        console.error('Error fetching polling units:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// RESULT FUNCTIONS
// ============================================

/**
 * Submit election result
 */
async function submitResult(agentId, resultData) {
    try {
        const resultId = generateId();
        const data = {
            resultId: resultId,
            agentId: agentId,
            pollingUnitUID: resultData.pollingUnitUID,
            lga: resultData.lga,
            ward: resultData.ward,
            registeredVoters: resultData.registeredVoters,
            accreditedVoters: resultData.accreditedVoters,
            validVotes: resultData.validVotes,
            rejectedVotes: resultData.rejectedVotes,
            partyVotes: resultData.partyVotes,
            totalPartyVotes: Object.values(resultData.partyVotes).reduce((a, b) => a + b, 0),
            status: 'pending', // pending, approved, rejected
            submittedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            verifiedBy: null,
            verifiedAt: null,
            notes: resultData.notes || '',
            ipAddress: resultData.ipAddress || '',
            deviceInfo: resultData.deviceInfo || {}
        };
        
        // Save result
        await setDoc(doc(db, COLLECTIONS.RESULTS, resultId), data);
        
        // Update agent submission stats
        const statsRef = doc(db, COLLECTIONS.AGENTS, agentId, 'history', 'stats');
        await updateDoc(statsRef, {
            totalSubmissions: increment(1),
            lastSubmission: getCurrentTimestamp()
        });
        
        // Add to submission history
        await setDoc(doc(db, COLLECTIONS.AGENTS, agentId, 'history', resultId), {
            resultId: resultId,
            pollingUnitUID: resultData.pollingUnitUID,
            accreditedVoters: resultData.accreditedVoters,
            validVotes: resultData.validVotes,
            status: 'pending',
            submittedAt: getCurrentTimestamp()
        });
        
        // Log audit
        await logAudit(agentId, 'SUBMIT_RESULT', COLLECTIONS.RESULTS, resultId, data);
        
        return {
            success: true,
            resultId: resultId,
            data: data
        };
        
    } catch (error) {
        console.error('Error submitting result:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get results by agent
 */
async function getAgentResults(agentId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.RESULTS),
            where('agentId', '==', agentId),
            orderBy('submittedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: results
        };
    } catch (error) {
        console.error('Error fetching results:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get results by LGA
 */
async function getLgaResults(lga) {
    try {
        const q = query(
            collection(db, COLLECTIONS.RESULTS),
            where('lga', '==', lga),
            where('status', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: results
        };
    } catch (error) {
        console.error('Error fetching LGA results:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all results (Admin only)
 */
async function getAllResults() {
    try {
        const q = query(
            collection(db, COLLECTIONS.RESULTS),
            orderBy('submittedAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: results
        };
    } catch (error) {
        console.error('Error fetching all results:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Approve result (Admin only)
 */
async function approveResult(resultId, adminId) {
    try {
        await updateDoc(doc(db, COLLECTIONS.RESULTS, resultId), {
            status: 'approved',
            verifiedBy: adminId,
            verifiedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        });
        
        // Log audit
        await logAudit(adminId, 'APPROVE_RESULT', COLLECTIONS.RESULTS, resultId, { status: 'approved' });
        
        return { success: true };
    } catch (error) {
        console.error('Error approving result:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Reject result (Admin only)
 */
async function rejectResult(resultId, adminId, reason) {
    try {
        await updateDoc(doc(db, COLLECTIONS.RESULTS, resultId), {
            status: 'rejected',
            verifiedBy: adminId,
            verifiedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            rejectionReason: reason
        });
        
        // Log audit
        await logAudit(adminId, 'REJECT_RESULT', COLLECTIONS.RESULTS, resultId, { status: 'rejected', reason });
        
        return { success: true };
    } catch (error) {
        console.error('Error rejecting result:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// LGA AND WARD FUNCTIONS
// ============================================

/**
 * Get all LGAs
 */
async function getAllLGAs() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.LGAS));
        const lgas = [];
        querySnapshot.forEach((doc) => {
            lgas.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: lgas
        };
    } catch (error) {
        console.error('Error fetching LGAs:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get wards by LGA
 */
async function getWardsByLGA(lgaId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.WARDS),
            where('lgaId', '==', lgaId)
        );
        const querySnapshot = await getDocs(q);
        const wards = [];
        querySnapshot.forEach((doc) => {
            wards.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: wards
        };
    } catch (error) {
        console.error('Error fetching wards:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// AUDIT LOG FUNCTIONS
// ============================================

/**
 * Log audit entry
 */
async function logAudit(userId, action, collection, recordId, data) {
    try {
        const auditData = {
            userId: userId,
            action: action,
            collection: collection,
            recordId: recordId,
            data: data,
            timestamp: getCurrentTimestamp(),
            ipAddress: data?.ipAddress || '',
            userAgent: navigator.userAgent || ''
        };
        
        await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, generateId()), auditData);
        return { success: true };
    } catch (error) {
        console.error('Error logging audit:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get audit logs
 */
async function getAuditLogs(limit = 100) {
    try {
        const q = query(
            collection(db, COLLECTIONS.AUDIT_LOGS),
            orderBy('timestamp', 'desc'),
            limit(limit)
        );
        const querySnapshot = await getDocs(q);
        const logs = [];
        querySnapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: logs
        };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to real-time results
 */
function subscribeToResults(callback) {
    const q = query(
        collection(db, COLLECTIONS.RESULTS),
        orderBy('submittedAt', 'desc'),
        limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        callback(results);
    }, (error) => {
        console.error('Error subscribing to results:', error);
    });
}

/**
 * Subscribe to agent's results
 */
function subscribeToAgentResults(agentId, callback) {
    const q = query(
        collection(db, COLLECTIONS.RESULTS),
        where('agentId', '==', agentId),
        orderBy('submittedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        callback(results);
    }, (error) => {
        console.error('Error subscribing to agent results:', error);
    });
}

/**
 * Subscribe to LGA results
 */
function subscribeToLgaResults(lga, callback) {
    const q = query(
        collection(db, COLLECTIONS.RESULTS),
        where('lga', '==', lga),
        where('status', '==', 'approved'),
        orderBy('submittedAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        callback(results);
    }, (error) => {
        console.error('Error subscribing to LGA results:', error);
    });
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Upload agent profile image
 */
async function uploadProfileImage(uid, file) {
    try {
        const storageRef = ref(storage, `agents/${uid}/profile.jpg`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update agent data
        await updateDoc(doc(db, COLLECTIONS.AGENTS, uid), {
            profileImage: downloadURL,
            updatedAt: getCurrentTimestamp()
        });
        
        return {
            success: true,
            url: downloadURL
        };
    } catch (error) {
        console.error('Error uploading profile image:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload result attachment
 */
async function uploadResultAttachment(resultId, file) {
    try {
        const storageRef = ref(storage, `results/${resultId}/${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update result with attachment
        await updateDoc(doc(db, COLLECTIONS.RESULTS, resultId), {
            attachments: arrayUnion({
                name: file.name,
                url: downloadURL,
                uploadedAt: getCurrentTimestamp()
            }),
            updatedAt: getCurrentTimestamp()
        });
        
        return {
            success: true,
            url: downloadURL
        };
    } catch (error) {
        console.error('Error uploading attachment:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Send notification to agent
 */
async function sendNotification(agentId, title, message, type = 'info') {
    try {
        await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, generateId()), {
            agentId: agentId,
            title: title,
            message: message,
            type: type,
            isRead: false,
            createdAt: getCurrentTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error sending notification:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get agent notifications
 */
async function getAgentNotifications(agentId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.NOTIFICATIONS),
            where('agentId', '==', agentId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const querySnapshot = await getDocs(q);
        const notifications = [];
        querySnapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: notifications
        };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId) {
    try {
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
            isRead: true
        });
        return { success: true };
    } catch (error) {
        console.error('Error marking notification:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// DATA SEEDING (For Development)
// ============================================

/**
 * Seed LGAs into Firestore
 */
async function seedLGAs() {
    const lgas = [
        { id: '001', name: 'Bauchi', state: 'Bauchi' },
        { id: '002', name: 'Toro', state: 'Bauchi' },
        { id: '003', name: 'Ningi', state: 'Bauchi' },
        { id: '004', name: 'Katagum', state: 'Bauchi' },
        { id: '005', name: 'Gamawa', state: 'Bauchi' },
        { id: '006', name: 'Shira', state: 'Bauchi' },
        { id: '007', name: 'Alkaleri', state: 'Bauchi' },
        { id: '008', name: 'Darazo', state: 'Bauchi' },
        { id: '009', name: 'Ganjuwa', state: 'Bauchi' },
        { id: '010', name: 'Misau', state: 'Bauchi' },
        { id: '011', name: 'Tafawa-Balewa', state: 'Bauchi' },
        { id: '012', name: 'Itas/Gadau', state: 'Bauchi' },
        { id: '013', name: 'Kirfi', state: 'Bauchi' },
        { id: '014', name: 'Dambam', state: 'Bauchi' },
        { id: '015', name: 'Giade', state: 'Bauchi' },
        { id: '016', name: 'Warji', state: 'Bauchi' },
        { id: '017', name: "Jama'are", state: 'Bauchi' },
        { id: '018', name: 'Dass', state: 'Bauchi' },
        { id: '019', name: 'Bogoro', state: 'Bauchi' },
        { id: '020', name: 'Zaki', state: 'Bauchi' }
    ];
    
    for (const lga of lgas) {
        await setDoc(doc(db, COLLECTIONS.LGAS, lga.id), lga);
    }
    
    console.log('✅ LGAs seeded successfully!');
}

// ============================================
// EXPORT
// ============================================
export {
    // Auth
    auth,
    registerAgent,
    loginAgent,
    logoutAgent,
    getCurrentUser,
    onAuthStateChange,
    
    // Firestore
    db,
    COLLECTIONS,
    generateId,
    formatTimestamp,
    getCurrentTimestamp,
    
    // Agent
    getAgentData,
    getAllAgents,
    updateAgentData,
    verifyAgent,
    
    // Polling Units
    getPollingUnit,
    getPollingUnitsByLGA,
    getAllPollingUnits,
    
    // Results
    submitResult,
    getAgentResults,
    getLgaResults,
    getAllResults,
    approveResult,
    rejectResult,
    subscribeToResults,
    subscribeToAgentResults,
    subscribeToLgaResults,
    
    // LGA/Ward
    getAllLGAs,
    getWardsByLGA,
    
    // Audit
    logAudit,
    getAuditLogs,
    
    // Storage
    storage,
    uploadProfileImage,
    uploadResultAttachment,
    
    // Notifications
    sendNotification,
    getAgentNotifications,
    markNotificationRead,
    
    // Seed
    seedLGAs
};
