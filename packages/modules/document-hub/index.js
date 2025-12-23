/**
 * Document Hub Module - Central document management
 * Handles SOPs, resolutions, versioning, and search
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DocumentHub {
    constructor(config = {}) {
        this.baseDir = config.documentsPath || path.join(__dirname, '../../../data/documents');
        this.metadataFile = path.join(this.baseDir, 'metadata.json');
        this.ensureDirectories();
        this.metadata = this.loadMetadata();
    }

    /**
     * Ensure required directories exist
     */
    ensureDirectories() {
        const dirs = [
            this.baseDir,
            path.join(this.baseDir, 'sops'),
            path.join(this.baseDir, 'resolutions'),
            path.join(this.baseDir, 'contracts'),
            path.join(this.baseDir, 'compliance'),
            path.join(this.baseDir, 'general')
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }

    /**
     * Load metadata index
     */
    loadMetadata() {
        try {
            if (fs.existsSync(this.metadataFile)) {
                return JSON.parse(fs.readFileSync(this.metadataFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load metadata:', error.message);
        }
        return { documents: [], version: 1 };
    }

    /**
     * Save metadata index
     */
    saveMetadata() {
        fs.writeFileSync(this.metadataFile, JSON.stringify(this.metadata, null, 2));
    }

    /**
     * Add a document
     */
    addDocument(doc) {
        const id = doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const category = doc.category || 'general';
        const filename = doc.filename || `${id}.txt`;
        const filepath = path.join(this.baseDir, category, filename);

        // Write content
        if (doc.content) {
            fs.writeFileSync(filepath, doc.content);
        }

        // Add to metadata
        const docMeta = {
            id,
            title: doc.title || filename,
            category,
            filename,
            filepath,
            tags: doc.tags || [],
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: doc.createdBy || 'system'
        };

        this.metadata.documents.push(docMeta);
        this.saveMetadata();

        return docMeta;
    }

    /**
     * Update a document (creates new version)
     */
    updateDocument(id, updates) {
        const index = this.metadata.documents.findIndex(d => d.id === id);
        if (index === -1) {
            return { success: false, error: 'Document not found' };
        }

        const doc = this.metadata.documents[index];

        // If content is being updated, write new version
        if (updates.content) {
            // Backup old version
            const backupDir = path.join(this.baseDir, '.versions', id);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            if (fs.existsSync(doc.filepath)) {
                const versionPath = path.join(backupDir, `v${doc.version}.txt`);
                fs.copyFileSync(doc.filepath, versionPath);
            }

            // Write new content
            fs.writeFileSync(doc.filepath, updates.content);
            doc.version++;
        }

        // Update metadata
        if (updates.title) doc.title = updates.title;
        if (updates.tags) doc.tags = updates.tags;
        doc.updatedAt = new Date().toISOString();

        this.saveMetadata();
        return { success: true, document: doc };
    }

    /**
     * Get a document by ID
     */
    getDocument(id) {
        const doc = this.metadata.documents.find(d => d.id === id);
        if (!doc) return null;

        let content = null;
        if (fs.existsSync(doc.filepath)) {
            content = fs.readFileSync(doc.filepath, 'utf-8');
        }

        return { ...doc, content };
    }

    /**
     * Search documents
     */
    search(query) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const doc of this.metadata.documents) {
            let score = 0;

            // Title match (highest weight)
            if (doc.title.toLowerCase().includes(queryLower)) {
                score += 10;
            }

            // Tag match
            for (const tag of doc.tags) {
                if (tag.toLowerCase().includes(queryLower)) {
                    score += 5;
                }
            }

            // Category match
            if (doc.category.toLowerCase().includes(queryLower)) {
                score += 3;
            }

            // Content search (if exists)
            if (fs.existsSync(doc.filepath)) {
                const content = fs.readFileSync(doc.filepath, 'utf-8').toLowerCase();
                if (content.includes(queryLower)) {
                    score += 1;
                }
            }

            if (score > 0) {
                results.push({ ...doc, score });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * List documents by category
     */
    listByCategory(category) {
        return this.metadata.documents.filter(d => d.category === category);
    }

    /**
     * List all documents
     */
    listAll() {
        return this.metadata.documents;
    }

    /**
     * Delete a document
     */
    deleteDocument(id) {
        const index = this.metadata.documents.findIndex(d => d.id === id);
        if (index === -1) {
            return { success: false, error: 'Document not found' };
        }

        const doc = this.metadata.documents[index];

        // Move to trash instead of deleting
        const trashDir = path.join(this.baseDir, '.trash');
        if (!fs.existsSync(trashDir)) {
            fs.mkdirSync(trashDir, { recursive: true });
        }

        if (fs.existsSync(doc.filepath)) {
            const trashPath = path.join(trashDir, `${id}_${doc.filename}`);
            fs.renameSync(doc.filepath, trashPath);
        }

        // Remove from metadata
        this.metadata.documents.splice(index, 1);
        this.saveMetadata();

        return { success: true };
    }

    /**
     * Get statistics
     */
    getStats() {
        const categories = {};
        for (const doc of this.metadata.documents) {
            categories[doc.category] = (categories[doc.category] || 0) + 1;
        }

        return {
            totalDocuments: this.metadata.documents.length,
            byCategory: categories,
            lastUpdated: this.metadata.documents
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 5)
                .map(d => ({ id: d.id, title: d.title, updatedAt: d.updatedAt }))
        };
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'add':
                return this.addDocument(task.data);
            case 'update':
                return this.updateDocument(task.data.id, task.data);
            case 'delete':
                return this.deleteDocument(task.data.id);
            case 'search':
                return this.search(task.data.query);
            case 'list':
                return task.data?.category
                    ? this.listByCategory(task.data.category)
                    : this.listAll();
            case 'get':
                return this.getDocument(task.data.id);
            case 'stats':
                return this.getStats();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default DocumentHub;
