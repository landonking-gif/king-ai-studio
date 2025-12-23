/**
 * Compliance Module - Track filings, deadlines, and regulatory requirements
 * Manages compliance calendar, reminders, and document capture
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComplianceModule {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../../data/compliance');
        this.filingsFile = path.join(this.dataDir, 'filings.json');
        this.remindersFile = path.join(this.dataDir, 'reminders.json');
        this.ensureDataDir();
        this.filings = this.loadFilings();
        this.reminders = this.loadReminders();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadFilings() {
        try {
            if (fs.existsSync(this.filingsFile)) {
                return JSON.parse(fs.readFileSync(this.filingsFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load filings:', error.message);
        }
        return [];
    }

    loadReminders() {
        try {
            if (fs.existsSync(this.remindersFile)) {
                return JSON.parse(fs.readFileSync(this.remindersFile, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load reminders:', error.message);
        }
        return [];
    }

    saveFilings() {
        fs.writeFileSync(this.filingsFile, JSON.stringify(this.filings, null, 2));
    }

    saveReminders() {
        fs.writeFileSync(this.remindersFile, JSON.stringify(this.reminders, null, 2));
    }

    /**
     * Add a compliance filing requirement
     */
    addFiling(filing) {
        const id = filing.id || `filing-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newFiling = {
            id,
            name: filing.name,
            description: filing.description || '',
            entity: filing.entity || 'King Holdings',
            jurisdiction: filing.jurisdiction || '',
            filingType: filing.filingType || 'annual', // annual, quarterly, monthly, one-time
            dueDate: filing.dueDate,
            frequency: filing.frequency || 'yearly', // yearly, quarterly, monthly, one-time
            status: 'pending', // pending, in-progress, completed, overdue
            documents: filing.documents || [],
            notes: filing.notes || '',
            reminderDays: filing.reminderDays || [30, 14, 7, 1], // Days before due to remind
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.filings.push(newFiling);
        this.saveFilings();

        // Auto-create reminders
        this.createRemindersForFiling(newFiling);

        return newFiling;
    }

    /**
     * Create reminders for a filing
     */
    createRemindersForFiling(filing) {
        const dueDate = new Date(filing.dueDate);

        for (const daysBefore of filing.reminderDays) {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() - daysBefore);

            // Only create future reminders
            if (reminderDate > new Date()) {
                this.addReminder({
                    filingId: filing.id,
                    filingName: filing.name,
                    reminderDate: reminderDate.toISOString(),
                    daysBefore,
                    message: `${filing.name} is due in ${daysBefore} day(s) on ${dueDate.toLocaleDateString()}`
                });
            }
        }
    }

    /**
     * Add a reminder
     */
    addReminder(reminder) {
        const id = `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const newReminder = {
            id,
            ...reminder,
            status: 'pending', // pending, sent, dismissed
            createdAt: new Date().toISOString()
        };

        this.reminders.push(newReminder);
        this.saveReminders();
        return newReminder;
    }

    /**
     * Get due reminders (reminders that should be sent now)
     */
    getDueReminders() {
        const now = new Date();
        return this.reminders.filter(r => {
            const reminderDate = new Date(r.reminderDate);
            return r.status === 'pending' && reminderDate <= now;
        });
    }

    /**
     * Mark reminder as sent
     */
    markReminderSent(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            reminder.status = 'sent';
            reminder.sentAt = new Date().toISOString();
            this.saveReminders();
        }
    }

    /**
     * Update filing status
     */
    updateFilingStatus(filingId, status, notes = '') {
        const filing = this.filings.find(f => f.id === filingId);
        if (!filing) {
            return { success: false, error: 'Filing not found' };
        }

        filing.status = status;
        filing.updatedAt = new Date().toISOString();
        if (notes) {
            filing.notes = notes;
        }

        // If completed, dismiss pending reminders
        if (status === 'completed') {
            filing.completedAt = new Date().toISOString();
            this.reminders
                .filter(r => r.filingId === filingId && r.status === 'pending')
                .forEach(r => r.status = 'dismissed');
            this.saveReminders();
        }

        this.saveFilings();
        return { success: true, filing };
    }

    /**
     * Get upcoming filings (next N days)
     */
    getUpcomingFilings(days = 30) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return this.filings
            .filter(f => {
                const dueDate = new Date(f.dueDate);
                return f.status !== 'completed' && dueDate >= now && dueDate <= futureDate;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    /**
     * Get overdue filings
     */
    getOverdueFilings() {
        const now = new Date();

        const overdue = this.filings.filter(f => {
            const dueDate = new Date(f.dueDate);
            return f.status !== 'completed' && dueDate < now;
        });

        // Update status to overdue
        overdue.forEach(f => {
            if (f.status !== 'overdue') {
                f.status = 'overdue';
                f.updatedAt = new Date().toISOString();
            }
        });

        if (overdue.length > 0) {
            this.saveFilings();
        }

        return overdue;
    }

    /**
     * Get filings by entity
     */
    getFilingsByEntity(entity) {
        return this.filings.filter(f => f.entity === entity);
    }

    /**
     * Get all filings
     */
    getAllFilings() {
        return this.filings;
    }

    /**
     * Get compliance summary
     */
    getSummary() {
        const overdue = this.getOverdueFilings();
        const upcoming = this.getUpcomingFilings(30);
        const pendingReminders = this.getDueReminders();

        return {
            totalFilings: this.filings.length,
            completed: this.filings.filter(f => f.status === 'completed').length,
            pending: this.filings.filter(f => f.status === 'pending').length,
            inProgress: this.filings.filter(f => f.status === 'in-progress').length,
            overdue: overdue.length,
            upcomingNext30Days: upcoming.length,
            pendingReminders: pendingReminders.length,
            nextDue: upcoming[0] || null,
            overdueList: overdue.map(f => ({ id: f.id, name: f.name, dueDate: f.dueDate }))
        };
    }

    /**
     * Add common filing templates
     */
    addCommonFilings(entity = 'King Holdings', state = 'TX') {
        const commonFilings = [
            {
                name: 'Annual Report',
                description: 'State annual report filing',
                entity,
                jurisdiction: state,
                filingType: 'annual',
                frequency: 'yearly',
                dueDate: this.getNextAnnualDate(),
                reminderDays: [60, 30, 14, 7]
            },
            {
                name: 'Franchise Tax',
                description: 'State franchise tax filing',
                entity,
                jurisdiction: state,
                filingType: 'annual',
                frequency: 'yearly',
                dueDate: this.getDateByMonthDay(5, 15), // May 15 for Texas
                reminderDays: [60, 30, 14, 7]
            },
            {
                name: 'Registered Agent Update',
                description: 'Verify and update registered agent information',
                entity,
                jurisdiction: state,
                filingType: 'annual',
                frequency: 'yearly',
                dueDate: this.getNextAnnualDate(),
                reminderDays: [30, 14]
            }
        ];

        const added = commonFilings.map(f => this.addFiling(f));
        return added;
    }

    /**
     * Helper: Get next annual date (1 year from now)
     */
    getNextAnnualDate() {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
    }

    /**
     * Helper: Get date by month and day
     */
    getDateByMonthDay(month, day) {
        const date = new Date();
        date.setMonth(month - 1, day);
        if (date < new Date()) {
            date.setFullYear(date.getFullYear() + 1);
        }
        return date.toISOString().split('T')[0];
    }

    /**
     * Execute a task from the orchestrator
     */
    async execute(task) {
        switch (task.action) {
            case 'add':
                return this.addFiling(task.data);
            case 'update_status':
                return this.updateFilingStatus(task.data.id, task.data.status, task.data.notes);
            case 'get_upcoming':
                return this.getUpcomingFilings(task.data?.days || 30);
            case 'get_overdue':
                return this.getOverdueFilings();
            case 'get_summary':
                return this.getSummary();
            case 'add_common':
                return this.addCommonFilings(task.data?.entity, task.data?.state);
            case 'get_due_reminders':
                return this.getDueReminders();
            case 'list':
                return this.getAllFilings();
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }
}

export default ComplianceModule;
