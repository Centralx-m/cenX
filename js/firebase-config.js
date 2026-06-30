/**
 * ============================================
 * FIREBASE CONFIGURATION - Updated with Election Types
 * Bauchi State Election Watch
 * Powered by WebHotel.Cloud
 * ============================================
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile,
    sendPasswordResetEmail
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
    Timestamp,
    runTransaction,
    limit
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
    NOTIFICATIONS: 'notifications',
    ELECTIONS: 'elections',           // NEW: Election types
    ELECTION_AGENTS: 'election_agents', // NEW: Agent assignments
    ELECTION_RESULTS: 'election_results', // NEW: Results per election
    PARTIES: 'parties'
};

// ============================================
// ELECTION TYPES
// ============================================
const ELECTION_TYPES = {
    NATIONAL: 'national',
    STATE: 'state',
    LOCAL_GOVERNMENT: 'local_government'
};

const ELECTION_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId() {
    return doc(collection(db, 'temp')).id;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
}

function getCurrentTimestamp() {
    return serverTimestamp();
}

function getElectionTypeLabel(type) {
    const labels = {
        'national': 'National Election',
        'state': 'State Election',
        'local_government': 'Local Government Election'
    };
    return labels[type] || type;
}

function getStatusBadge(status) {
    const badges = {
        'draft': '<span class="badge badge-secondary">Draft</span>',
        'active': '<span class="badge badge-primary">Active</span>',
        'ongoing': '<span class="badge badge-warning">Ongoing</span>',
        'completed': '<span class="badge badge-success">Completed</span>',
        'cancelled': '<span class="badge badge-danger">Cancelled</span>'
    };
    return badges[status] || status;
}

// ============================================
// AUTH FUNCTIONS
// ============================================

async function registerAgent(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, {
            displayName: `${userData.firstName} ${userData.lastName}`
        });
        
        await sendEmailVerification(user);
        
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
            deviceId: userData.deviceId || '',
            deviceInfo: userData.deviceInfo || {},
            assignedElections: [] // NEW: Elections assigned to agent
        };
        
        await setDoc(doc(db, COLLECTIONS.AGENTS, user.uid), agentData);
        
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

async function loginAgent(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateDoc(doc(db, COLLECTIONS.AGENTS, user.uid), {
            lastLogin: getCurrentTimestamp()
        });
        
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

function getCurrentUser() {
    return auth.currentUser;
}

function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// ============================================
// ELECTION MANAGEMENT FUNCTIONS (Admin Only)
// ============================================

/**
 * Create a new election
 */
async function createElection(electionData) {
    try {
        const electionId = generateId();
        const data = {
            electionId: electionId,
            title: electionData.title,
            type: electionData.type, // 'national', 'state', 'local_government'
            description: electionData.description || '',
            state: electionData.state || '',
            lga: electionData.lga || '',
            startDate: electionData.startDate || null,
            endDate: electionData.endDate || null,
            status: ELECTION_STATUS.DRAFT,
            parties: electionData.parties || [],
            positions: electionData.positions || [],
            totalPollingUnits: 0,
            totalAgents: 0,
            totalResults: 0,
            createdBy: electionData.createdBy,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            resultsSummary: {
                totalVotes: 0,
                validVotes: 0,
                rejectedVotes: 0,
                turnout: 0,
                partyResults: {}
            }
        };
        
        await setDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), data);
        
        // Log audit
        await logAudit(electionData.createdBy, 'CREATE_ELECTION', COLLECTIONS.ELECTIONS, electionId, data);
        
        return {
            success: true,
            electionId: electionId,
            data: data
        };
        
    } catch (error) {
        console.error('Error creating election:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get all elections
 */
async function getAllElections() {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTIONS),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const elections = [];
        querySnapshot.forEach((doc) => {
            elections.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: elections
        };
    } catch (error) {
        console.error('Error fetching elections:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get election by ID
 */
async function getElection(electionId) {
    try {
        const docRef = doc(db, COLLECTIONS.ELECTIONS, electionId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return {
                success: true,
                data: docSnap.data()
            };
        } else {
            return {
                success: false,
                error: 'Election not found'
            };
        }
    } catch (error) {
        console.error('Error fetching election:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Update election
 */
async function updateElection(electionId, data) {
    try {
        await updateDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), {
            ...data,
            updatedAt: getCurrentTimestamp()
        });
        
        // Log audit
        const user = getCurrentUser();
        if (user) {
            await logAudit(user.uid, 'UPDATE_ELECTION', COLLECTIONS.ELECTIONS, electionId, data);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating election:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete election
 */
async function deleteElection(electionId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.ELECTIONS, electionId));
        
        // Also delete all related data
        // Delete election agents
        const agentsQuery = query(
            collection(db, COLLECTIONS.ELECTION_AGENTS),
            where('electionId', '==', electionId)
        );
        const agentsSnapshot = await getDocs(agentsQuery);
        agentsSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        // Delete election results
        const resultsQuery = query(
            collection(db, COLLECTIONS.ELECTION_RESULTS),
            where('electionId', '==', electionId)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        resultsSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting election:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get elections by type
 */
async function getElectionsByType(type) {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTIONS),
            where('type', '==', type),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const elections = [];
        querySnapshot.forEach((doc) => {
            elections.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: elections
        };
    } catch (error) {
        console.error('Error fetching elections by type:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get active elections
 */
async function getActiveElections() {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTIONS),
            where('status', 'in', ['active', 'ongoing']),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const elections = [];
        querySnapshot.forEach((doc) => {
            elections.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: elections
        };
    } catch (error) {
        console.error('Error fetching active elections:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// AGENT ELECTION ASSIGNMENT (Admin Only)
// ============================================

/**
 * Assign agent to election
 */
async function assignAgentToElection(electionId, agentId, pollingUnitUID) {
    try {
        // Check if already assigned
        const existingQuery = query(
            collection(db, COLLECTIONS.ELECTION_AGENTS),
            where('electionId', '==', electionId),
            where('agentId', '==', agentId)
        );
        const existing = await getDocs(existingQuery);
        
        if (!existing.empty) {
            return {
                success: false,
                error: 'Agent already assigned to this election'
            };
        }
        
        const assignmentId = generateId();
        const data = {
            assignmentId: assignmentId,
            electionId: electionId,
            agentId: agentId,
            pollingUnitUID: pollingUnitUID,
            status: 'assigned', // assigned, active, completed
            assignedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            submissions: 0,
            lastSubmission: null
        };
        
        await setDoc(doc(db, COLLECTIONS.ELECTION_AGENTS, assignmentId), data);
        
        // Update agent's assigned elections
        await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
            assignedElections: arrayUnion(electionId),
            updatedAt: getCurrentTimestamp()
        });
        
        // Update election agent count
        await updateDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), {
            totalAgents: increment(1),
            updatedAt: getCurrentTimestamp()
        });
        
        // Log audit
        const user = getCurrentUser();
        if (user) {
            await logAudit(user.uid, 'ASSIGN_AGENT', COLLECTIONS.ELECTION_AGENTS, assignmentId, data);
        }
        
        // Send notification to agent
        await sendNotification(agentId, 'Election Assignment', 
            `You have been assigned to election: ${electionId} for polling unit ${pollingUnitUID}`, 'info');
        
        return {
            success: true,
            assignmentId: assignmentId,
            data: data
        };
        
    } catch (error) {
        console.error('Error assigning agent:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get agents assigned to election
 */
async function getElectionAgents(electionId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTION_AGENTS),
            where('electionId', '==', electionId)
        );
        const querySnapshot = await getDocs(q);
        const assignments = [];
        querySnapshot.forEach((doc) => {
            assignments.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: assignments
        };
    } catch (error) {
        console.error('Error fetching election agents:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get agent's assigned elections
 */
async function getAgentElections(agentId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTION_AGENTS),
            where('agentId', '==', agentId)
        );
        const querySnapshot = await getDocs(q);
        const assignments = [];
        querySnapshot.forEach((doc) => {
            assignments.push({ id: doc.id, ...doc.data() });
        });
        return {
            success: true,
            data: assignments
        };
    } catch (error) {
        console.error('Error fetching agent elections:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Remove agent from election
 */
async function removeAgentFromElection(assignmentId, electionId, agentId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.ELECTION_AGENTS, assignmentId));
        
        // Remove from agent's assigned elections
        await updateDoc(doc(db, COLLECTIONS.AGENTS, agentId), {
            assignedElections: arrayRemove(electionId),
            updatedAt: getCurrentTimestamp()
        });
        
        // Update election agent count
        await updateDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), {
            totalAgents: increment(-1),
            updatedAt: getCurrentTimestamp()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error removing agent:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// ELECTION RESULTS SUBMISSION
// ============================================

/**
 * Submit result for election
 */
async function submitElectionResult(agentId, electionId, resultData) {
    try {
        // Verify agent is assigned to this election
        const assignmentQuery = query(
            collection(db, COLLECTIONS.ELECTION_AGENTS),
            where('electionId', '==', electionId),
            where('agentId', '==', agentId)
        );
        const assignmentSnap = await getDocs(assignmentQuery);
        
        if (assignmentSnap.empty) {
            return {
                success: false,
                error: 'You are not assigned to this election'
            };
        }
        
        const assignment = assignmentSnap.docs[0];
        const assignmentId = assignment.id;
        
        // Check if result already submitted for this polling unit
        const existingQuery = query(
            collection(db, COLLECTIONS.ELECTION_RESULTS),
            where('electionId', '==', electionId),
            where('pollingUnitUID', '==', resultData.pollingUnitUID)
        );
        const existing = await getDocs(existingQuery);
        
        if (!existing.empty) {
            return {
                success: false,
                error: 'Result already submitted for this polling unit'
            };
        }
        
        const resultId = generateId();
        const data = {
            resultId: resultId,
            electionId: electionId,
            agentId: agentId,
            assignmentId: assignmentId,
            pollingUnitUID: resultData.pollingUnitUID,
            lga: resultData.lga,
            ward: resultData.ward,
            registeredVoters: resultData.registeredVoters,
            accreditedVoters: resultData.accreditedVoters,
            validVotes: resultData.validVotes,
            rejectedVotes: resultData.rejectedVotes,
            partyVotes: resultData.partyVotes,
            totalPartyVotes: Object.values(resultData.partyVotes).reduce((a, b) => a + b, 0),
            status: 'pending',
            submittedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            verifiedBy: null,
            verifiedAt: null,
            notes: resultData.notes || '',
            attachments: resultData.attachments || []
        };
        
        await setDoc(doc(db, COLLECTIONS.ELECTION_RESULTS, resultId), data);
        
        // Update assignment
        await updateDoc(doc(db, COLLECTIONS.ELECTION_AGENTS, assignmentId), {
            submissions: increment(1),
            lastSubmission: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        });
        
        // Update election total results
        await updateDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), {
            totalResults: increment(1),
            updatedAt: getCurrentTimestamp()
        });
        
        // Log audit
        await logAudit(agentId, 'SUBMIT_ELECTION_RESULT', COLLECTIONS.ELECTION_RESULTS, resultId, data);
        
        return {
            success: true,
            resultId: resultId,
            data: data
        };
        
    } catch (error) {
        console.error('Error submitting election result:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get election results
 */
async function getElectionResults(electionId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.ELECTION_RESULTS),
            where('electionId', '==', electionId),
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
        console.error('Error fetching election results:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Approve election result
 */
async function approveElectionResult(resultId, adminId) {
    try {
        await updateDoc(doc(db, COLLECTIONS.ELECTION_RESULTS, resultId), {
            status: 'approved',
            verifiedBy: adminId,
            verifiedAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        });
        
        // Get result data to update election summary
        const resultDoc = await getDoc(doc(db, COLLECTIONS.ELECTION_RESULTS, resultId));
        const resultData = resultDoc.data();
        
        if (resultData) {
            const electionId = resultData.electionId;
            const electionDoc = await getDoc(doc(db, COLLECTIONS.ELECTIONS, electionId));
            const electionData = electionDoc.data();
            
            if (electionData) {
                // Update election results summary
                const summary = electionData.resultsSummary || {
                    totalVotes: 0,
                    validVotes: 0,
                    rejectedVotes: 0,
                    turnout: 0,
                    partyResults: {}
                };
                
                summary.totalVotes += resultData.accreditedVoters || 0;
                summary.validVotes += resultData.validVotes || 0;
                summary.rejectedVotes += resultData.rejectedVotes || 0;
                
                // Update party results
                const partyVotes = resultData.partyVotes || {};
                for (const [party, votes] of Object.entries(partyVotes)) {
                    summary.partyResults[party] = (summary.partyResults[party] || 0) + votes;
                }
                
                // Calculate turnout
                const totalRegistered = electionData.totalPollingUnits || 0;
                if (totalRegistered > 0) {
                    summary.turnout = (summary.totalVotes / totalRegistered) * 100;
                }
                
                await updateDoc(doc(db, COLLECTIONS.ELECTIONS, electionId), {
                    resultsSummary: summary,
                    updatedAt: getCurrentTimestamp()
                });
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error approving result:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// AGENT FUNCTIONS
// ============================================

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

// ============================================
// POLLING UNIT FUNCTIONS
// ============================================

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
// AUDIT LOG FUNCTIONS
// ============================================

async function logAudit(userId, action, collection, recordId, data) {
    try {
        const auditData = {
            userId: userId,
            action: action,
            collection: collection,
            recordId: recordId,
            data: data || {},
            timestamp: getCurrentTimestamp(),
            ipAddress: '',
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
// NOTIFICATION FUNCTIONS
// ============================================

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

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

function subscribeToElectionResults(electionId, callback) {
    const q = query(
        collection(db, COLLECTIONS.ELECTION_RESULTS),
        where('electionId', '==', electionId),
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
        console.error('Error subscribing to election results:', error);
    });
}

function subscribeToElection(electionId, callback) {
    return onSnapshot(doc(db, COLLECTIONS.ELECTIONS, electionId), (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() });
        }
    }, (error) => {
        console.error('Error subscribing to election:', error);
    });
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
    
    // Constants
    ELECTION_TYPES,
    ELECTION_STATUS,
    getElectionTypeLabel,
    getStatusBadge,
    
    // Agent
    getAgentData,
    getAllAgents,
    updateAgentData,
    
    // Polling Units
    getPollingUnit,
    getAllPollingUnits,
    
    // Election Management (Admin)
    createElection,
    getAllElections,
    getElection,
    updateElection,
    deleteElection,
    getElectionsByType,
    getActiveElections,
    
    // Agent Assignment (Admin)
    assignAgentToElection,
    getElectionAgents,
    getAgentElections,
    removeAgentFromElection,
    
    // Election Results
    submitElectionResult,
    getElectionResults,
    approveElectionResult,
    subscribeToElectionResults,
    subscribeToElection,
    
    // Audit
    logAudit,
    getAuditLogs,
    
    // Notifications
    sendNotification,
    getAgentNotifications
};
