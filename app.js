// ========== CONSTANTS ==========
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const VIRTUAL_NODES = ['node1', 'node2', 'node3'];
const DB_NAME = 'CloudStorageDB';
const DB_VERSION = 1;
const ENCRYPTION_KEY_LENGTH = 256;

// ========== IndexedDB MANAGEMENT ==========
/**
 * Initialize IndexedDB database
 * Stores file chunks, metadata, and user data
 */
class StorageManager {
    constructor() {
        this.db = null;
    }

    /**
     * Open or create IndexedDB database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'email' });
                }

                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('chunks')) {
                    db.createObjectStore('chunks', { keyPath: 'chunkId' });
                }

                if (!db.objectStoreNames.contains('nodeStorage')) {
                    db.createObjectStore('nodeStorage', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Add data to IndexedDB
     * @param {string} storeName - Store name (users, files, chunks, nodeStorage)
     * @param {object} data - Data to store
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Put (add or update) data in IndexedDB
     * @param {string} storeName - Store name
     * @param {object} data - Data to store
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Get data from IndexedDB
     * @param {string} storeName - Store name
     * @param {*} key - Key to retrieve
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Get all data from a store
     * @param {string} storeName - Store name
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Delete data from IndexedDB
     * @param {string} storeName - Store name
     * @param {*} key - Key to delete
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Clear all data from a store
     * @param {string} storeName - Store name
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}

// ========== ENCRYPTION MANAGER ==========
/**
 * Handle file encryption and decryption using CryptoJS
 */
class EncryptionManager {
    /**
     * Generate encryption key from password
     * @param {string} password - User password
     */
    static generateKey(password) {
        return CryptoJS.SHA256(password).toString();
    }

    /**
     * Encrypt data
     * @param {string} data - Data to encrypt
     * @param {string} key - Encryption key
     */
    static encrypt(data, key) {
        return CryptoJS.AES.encrypt(data, key).toString();
    }

    /**
     * Decrypt data
     * @param {string} encryptedData - Encrypted data
     * @param {string} key - Decryption key
     */
    static decrypt(encryptedData, key) {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    /**
     * Encrypt binary data (file chunks)
     * @param {ArrayBuffer} arrayBuffer - Binary data
     * @param {string} key - Encryption key
     */
    static encryptBinary(arrayBuffer, key) {
        const binary = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
        return CryptoJS.AES.encrypt(binary, key).toString();
    }

    /**
     * Decrypt binary data
     * @param {string} encryptedData - Encrypted data
     * @param {string} key - Decryption key
     */
    static decryptBinary(encryptedData, key) {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const binary = bytes.toString(CryptoJS.enc.Utf8);
        const len = binary.length;
        const array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array.buffer;
    }
}

// ========== FILE CHUNKING MANAGER ==========
/**
 * Handle file chunking and distributed storage across virtual nodes
 */
class FileChunkingManager {
    /**
     * Split file into chunks
     * @param {File} file - File to chunk
     * @param {Function} onProgress - Progress callback
     */
    static async chunkFile(file, onProgress = null) {
        const chunks = [];
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const arrayBuffer = await chunk.arrayBuffer();

            chunks.push({
                index: i,
                data: arrayBuffer,
                size: chunk.size
            });

            if (onProgress) {
                onProgress(i + 1, totalChunks);
            }
        }

        return chunks;
    }

    /**
     * Merge chunks back into file
     * @param {Array} chunks - Sorted chunks
     */
    static mergeChunks(chunks) {
        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
        const mergedArray = new Uint8Array(totalSize);
        let offset = 0;

        chunks.forEach(chunk => {
            const chunkData = new Uint8Array(chunk.data);
            mergedArray.set(chunkData, offset);
            offset += chunk.size;
        });

        return mergedArray.buffer;
    }

    /**
     * Distribute chunks across virtual nodes (HDFS simulation)
     * @param {Array} chunks - Chunks to distribute
     */
    static distributeChunks(chunks) {
        const distribution = {};
        VIRTUAL_NODES.forEach(node => {
            distribution[node] = [];
        });

        // Randomly distribute chunks across nodes
        chunks.forEach((chunk, index) => {
            const nodeIndex = Math.floor(Math.random() * VIRTUAL_NODES.length);
            const node = VIRTUAL_NODES[nodeIndex];
            distribution[node].push(chunk.index);
        });

        return distribution;
    }
}

// ========== AUTHENTICATION MANAGER ==========
/**
 * Handle user authentication (login/signup with localStorage)
 */
class AuthManager {
    /**
     * Sign up new user
     * @param {object} userData - {name, email, password}
     */
    static async signup(userData) {
        const existingUser = await storage.get('users', userData.email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const user = {
            email: userData.email,
            name: userData.name,
            password: EncryptionManager.generateKey(userData.password), // Hash password
            createdAt: new Date().toISOString()
        };

        await storage.put('users', user);
        return user;
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     */
    static async login(email, password) {
        const user = await storage.get('users', email);
        if (!user) {
            throw new Error('User not found');
        }

        const hashedPassword = EncryptionManager.generateKey(password);
        if (user.password !== hashedPassword) {
            throw new Error('Invalid password');
        }

        return user;
    }

    /**
     * Create session token
     * @param {object} user - User object
     */
    static createToken(user) {
        const token = {
            email: user.email,
            name: user.name,
            timestamp: Date.now()
        };
        localStorage.setItem('authToken', JSON.stringify(token));
        localStorage.setItem('userEmail', user.email);
        return token;
    }

    /**
     * Get current session
     */
    static getSession() {
        const token = localStorage.getItem('authToken');
        const userEmail = localStorage.getItem('userEmail');
        
        if (!token || !userEmail) {
            return null;
        }

        try {
            return JSON.parse(token);
        } catch {
            return null;
        }
    }

    /**
     * Logout user
     */
    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        return this.getSession() !== null;
    }
}

// ========== FILE MANAGER ==========
/**
 * Handle file operations (upload, download, delete)
 */
class FileManager {
    /**
     * Upload file
     * @param {File} file - File to upload
     * @param {Function} onProgress - Progress callback
     */
    static async uploadFile(file, onProgress = null) {
        const userEmail = localStorage.getItem('userEmail');
        const encryptionKey = EncryptionManager.generateKey(userEmail);
        const fileId = `${userEmail}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Step 1: Split file into chunks
            const chunks = await FileChunkingManager.chunkFile(file, (current, total) => {
                if (onProgress) onProgress(10 + (current / total) * 30, 'Chunking file...');
            });

            // Step 2: Encrypt chunks
            const encryptedChunks = chunks.map(chunk => ({
                ...chunk,
                encryptedData: EncryptionManager.encryptBinary(chunk.data, encryptionKey)
            }));

            if (onProgress) onProgress(40, 'Encrypting chunks...');

            // Step 3: Distribute chunks across virtual nodes
            const distribution = FileChunkingManager.distributeChunks(chunks);

            if (onProgress) onProgress(50, 'Distributing to nodes...');

            // Step 4: Store chunks in IndexedDB
            const storedChunkIds = [];
            for (let i = 0; i < encryptedChunks.length; i++) {
                const chunkId = `${fileId}_chunk_${i}`;
                const chunkData = {
                    chunkId,
                    fileId,
                    index: i,
                    encryptedData: encryptedChunks[i].encryptedData,
                    size: encryptedChunks[i].size,
                    node: VIRTUAL_NODES[Object.keys(distribution).find(node => 
                        distribution[node].includes(i)
                    ) || 0]
                };

                await storage.put('chunks', chunkData);
                storedChunkIds.push(chunkId);

                if (onProgress) {
                    onProgress(50 + (i / encryptedChunks.length) * 40, 'Storing chunks...');
                }
            }

            // Step 5: Store file metadata
            const fileMetadata = {
                id: fileId,
                name: file.name,
                originalName: file.name,
                type: file.type,
                size: file.size,
                chunks: storedChunkIds,
                distribution,
                uploadDate: new Date().toISOString(),
                userEmail
            };

            await storage.put('files', fileMetadata);
            await this.updateNodeStorage(distribution);

            if (onProgress) onProgress(100, 'Upload complete');

            return fileMetadata;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    /**
     * Update node storage with chunk information
     * @param {object} distribution - Chunk distribution
     */
    static async updateNodeStorage(distribution) {
        for (const node of VIRTUAL_NODES) {
            const nodeData = await storage.get('nodeStorage', node) || { id: node, chunks: [] };
            const newChunks = distribution[node] || [];
            nodeData.chunks = [...(nodeData.chunks || []), ...newChunks];
            await storage.put('nodeStorage', nodeData);
        }
    }

    /**
     * Download file
     * @param {string} fileId - File ID
     */
    static async downloadFile(fileId) {
        const userEmail = localStorage.getItem('userEmail');
        const encryptionKey = EncryptionManager.generateKey(userEmail);

        const fileMetadata = await storage.get('files', fileId);
        if (!fileMetadata) {
            throw new Error('File not found');
        }

        // Step 1: Retrieve chunks from storage
        const chunks = [];
        for (const chunkId of fileMetadata.chunks) {
            const chunkData = await storage.get('chunks', chunkId);
            if (chunkData) {
                chunks.push({
                    index: chunkData.index,
                    data: EncryptionManager.decryptBinary(chunkData.encryptedData, encryptionKey),
                    size: chunkData.size
                });
            }
        }

        // Step 2: Sort chunks by index
        chunks.sort((a, b) => a.index - b.index);

        // Step 3: Merge chunks
        const mergedBuffer = FileChunkingManager.mergeChunks(chunks);

        // Step 4: Create blob and download
        const blob = new Blob([mergedBuffer], { type: fileMetadata.type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileMetadata.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Delete file
     * @param {string} fileId - File ID
     */
    static async deleteFile(fileId) {
        const fileMetadata = await storage.get('files', fileId);
        if (!fileMetadata) {
            throw new Error('File not found');
        }

        // Delete chunks
        for (const chunkId of fileMetadata.chunks) {
            await storage.delete('chunks', chunkId);
        }

        // Delete metadata
        await storage.delete('files', fileId);

        // Update node storage
        const distribution = fileMetadata.distribution;
        for (const node of VIRTUAL_NODES) {
            const nodeData = await storage.get('nodeStorage', node);
            if (nodeData) {
                nodeData.chunks = nodeData.chunks.filter(c => !distribution[node]?.includes(c));
                await storage.put('nodeStorage', nodeData);
            }
        }
    }

    /**
     * Get all files for current user
     */
    static async getUserFiles() {
        const userEmail = localStorage.getItem('userEmail');
        const allFiles = await storage.getAll('files');
        return allFiles.filter(file => file.userEmail === userEmail);
    }

    /**
     * Get file statistics
     */
    static async getFileStats() {
        const files = await this.getUserFiles();
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const nodeStats = {};

        for (const node of VIRTUAL_NODES) {
            const nodeData = await storage.get('nodeStorage', node);
            nodeStats[node] = nodeData?.chunks?.length || 0;
        }

        return {
            fileCount: files.length,
            totalSize,
            nodeStats
        };
    }
}

// ========== UI MANAGER ==========
/**
 * Handle UI updates and user interactions
 */
class UIManager {
    /**
     * Show auth page
     */
    static showAuthPage() {
        if (window.location.pathname.includes('dashboard')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Show dashboard page
     */
    static showDashboard() {
        if (!window.location.pathname.includes('dashboard')) {
            window.location.href = 'dashboard.html';
        }
    }

    /**
     * Update file list
     */
    static async updateFileList() {
        const files = await FileManager.getUserFiles();
        const filesList = document.getElementById('filesList');

        if (files.length === 0) {
            filesList.innerHTML = '<p class="no-files">No files uploaded yet</p>';
            return;
        }

        filesList.innerHTML = files.map(file => `
            <div class="file-card">
                <div class="file-icon">📄</div>
                <div class="file-name">${this.escapeHtml(file.originalName)}</div>
                <div class="file-meta">
                    <div class="file-meta-item">
                        <span>Size:</span>
                        <span>${this.formatBytes(file.size)}</span>
                    </div>
                    <div class="file-meta-item">
                        <span>Chunks:</span>
                        <span>${file.chunks.length}</span>
                    </div>
                    <div class="file-meta-item">
                        <span>Date:</span>
                        <span>${new Date(file.uploadDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn btn-primary" onclick="downloadFile('${file.id}')">⬇️ Download</button>
                    <button class="btn btn-danger" onclick="openDeleteModal('${file.id}', '${this.escapeHtml(file.originalName)}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update statistics
     */
    static async updateStats() {
        const stats = await FileManager.getFileStats();
        document.getElementById('fileCount').textContent = stats.fileCount;
        document.getElementById('totalSize').textContent = this.formatBytes(stats.totalSize);

        const nodeStatusElements = document.querySelectorAll('.node-item');
        Object.entries(stats.nodeStats).forEach(([node, count], index) => {
            if (nodeStatusElements[index]) {
                nodeStatusElements[index].querySelector('.node-chunks').textContent = `${count} chunks`;
            }
        });
    }

    /**
     * Update user info
     */
    static updateUserInfo() {
        const session = AuthManager.getSession();
        if (session) {
            document.getElementById('userInfo').textContent = `Welcome, ${session.name}`;
        }
    }

    /**
     * Format bytes to readable format
     */
    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Show error message
     */
    static showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            setTimeout(() => {
                errorElement.classList.remove('show');
            }, 5000);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ========== GLOBAL STATE ==========
let storage = new StorageManager();
let currentFileId = null;

// ========== INITIALIZATION ==========
/**
 * Initialize application based on current page
 */
async function initApp() {
    try {
        await storage.init();

        // Check if on auth page
        if (document.getElementById('loginForm')) {
            initAuthPage();
        }
        // Check if on dashboard page
        else if (document.getElementById('filesList')) {
            initDashboard();
        }
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

/**
 * Initialize authentication page
 */
function initAuthPage() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Redirect to dashboard if already authenticated
    if (AuthManager.isAuthenticated()) {
        window.location.href = 'dashboard.html';
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const user = await AuthManager.login(email, password);
                AuthManager.createToken(user);
                window.location.href = 'dashboard.html';
            } catch (error) {
                UIManager.showError('loginError', error.message);
            }
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirm').value;

            if (password !== confirmPassword) {
                UIManager.showError('signupError', 'Passwords do not match');
                return;
            }

            try {
                await AuthManager.signup({ name, email, password });
                UIManager.showError('signupError', 'Signup successful! Please login.');
                document.getElementById('signupForm').reset();
                setTimeout(() => toggleAuth(), 1500);
            } catch (error) {
                UIManager.showError('signupError', error.message);
            }
        });
    }
}

/**
 * Initialize dashboard page
 */
async function initDashboard() {
    // Redirect to login if not authenticated
    if (!AuthManager.isAuthenticated()) {
        window.location.href = 'index.html';
    }

    UIManager.updateUserInfo();
    await UIManager.updateFileList();
    await UIManager.updateStats();

    // File input handling
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            AuthManager.logout();
            window.location.href = 'index.html';
        });
    }

    // Drag and drop
    const uploadBox = document.querySelector('.upload-box');
    if (uploadBox) {
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--primary-color)';
            uploadBox.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
        });

        uploadBox.addEventListener('dragleave', () => {
            uploadBox.style.borderColor = 'var(--border-color)';
            uploadBox.style.backgroundColor = 'var(--bg-color)';
        });

        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--border-color)';
            uploadBox.style.backgroundColor = 'var(--bg-color)';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                handleFileUpload();
            }
        });
    }
}

// ========== EVENT HANDLERS ==========
/**
 * Toggle between login and signup forms
 */
function toggleAuth() {
    const loginBox = document.getElementById('loginBox');
    const signupBox = document.getElementById('signupBox');
    if (loginBox && signupBox) {
        loginBox.classList.toggle('hidden');
        signupBox.classList.toggle('hidden');
    }
}

/**
 * Handle file upload
 */
async function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;

    if (files.length === 0) return;

    for (let file of files) {
        try {
            showUploadProgress(true, file.name);

            await FileManager.uploadFile(file, (progress, status) => {
                updateUploadProgress(progress, file.name, status);
            });

            showUploadProgress(false);
            fileInput.value = '';
            
            await UIManager.updateFileList();
            await UIManager.updateStats();
        } catch (error) {
            console.error('Upload failed:', error);
            UIManager.showError('uploadProgress', `Upload failed: ${error.message}`);
            showUploadProgress(false);
        }
    }
}

/**
 * Show/hide upload progress
 */
function showUploadProgress(show, fileName = '') {
    const progressContainer = document.getElementById('uploadProgress');
    if (progressContainer) {
        if (show) {
            progressContainer.classList.remove('hidden');
            document.getElementById('progressFileName').textContent = fileName;
        } else {
            progressContainer.classList.add('hidden');
        }
    }
}

/**
 * Update upload progress bar
 */
function updateUploadProgress(progress, fileName, status) {
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
    document.getElementById('progressFileName').textContent = `${fileName} - ${status}`;
}

/**
 * Download file
 */
async function downloadFile(fileId) {
    try {
        await FileManager.downloadFile(fileId);
    } catch (error) {
        UIManager.showError('filesList', `Download failed: ${error.message}`);
    }
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(fileId, fileName) {
    currentFileId = fileId;
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.querySelector('.modal-content p').textContent = `Are you sure you want to delete "${fileName}"?`;
    }
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentFileId = null;
}

/**
 * Confirm file deletion
 */
async function confirmDelete() {
    if (!currentFileId) return;

    try {
        await FileManager.deleteFile(currentFileId);
        closeDeleteModal();
        await UIManager.updateFileList();
        await UIManager.updateStats();
    } catch (error) {
        UIManager.showError('deleteModal', `Delete failed: ${error.message}`);
    }
}

/**
 * Load/refresh files
 */
async function loadFiles() {
    await UIManager.updateFileList();
    await UIManager.updateStats();
}

// Connect confirm delete button
document.addEventListener('DOMContentLoaded', () => {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
