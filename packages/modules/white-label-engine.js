/**
 * White Label Engine - Packages businesses for resale/licensing
 * Strips branding and prepares assets for white-label clients
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WhiteLabelEngine {
    constructor(config = {}) {
        this.dataDir = config.dataDir || path.join(__dirname, '../../data/products');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Create a white-label package from a business
     */
    createPackage(business) {
        console.log(`[WhiteLabel] Packaging ${business.name} for white-labeling...`);

        const pkg = {
            id: `wl-${Date.now()}`,
            originalBusiness: business.id,
            name: `${business.name} (White Label)`,
            description: "Rebrandable version of the platform.",
            features: business.services || business.products || [],
            customizationOptions: [
                'Logo Replacement',
                'Color Scheme',
                'Domain Mapping',
                'Email Templates'
            ],
            licensePrice: {
                monthly: 299,
                yearly: 2999,
                lifetime: 9999
            },
            assets: [
                'source_code.zip (sanitized)',
                'deployment_guide.pdf',
                'marketing_materials.zip'
            ],
            createdAt: new Date().toISOString()
        };

        const file = path.join(this.dataDir, 'white-label-packages.json');
        let packages = [];
        if (fs.existsSync(file)) packages = JSON.parse(fs.readFileSync(file));

        packages.push(pkg);
        fs.writeFileSync(file, JSON.stringify(packages, null, 2));

        return pkg;
    }

    async execute(task) {
        if (task.action === 'package') return this.createPackage(task.data.business);
    }
}
export default WhiteLabelEngine;
