const { execSync } = require('child_process');

function notifyAgent(context) {
    try {
        console.log(`🔔 Notifying Main Agent about: ${context.mode} - ${context.itemTitle || context.counterpartName}`);
        
        const jsonContext = JSON.stringify(context);
        const message = `New Kleinanzeigen Action Required. Context: ${jsonContext}`;
        
        const safeMsg = message
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$')
            .replace(/\n/g, '\\n');

        execSync(`/usr/bin/openclaw cron wake --text "${safeMsg}" --mode now`);
        console.log('✅ Notification sent.');
        return true;
    } catch (e) {
        console.error('❌ Failed to send notification:', e.message);
        return false;
    }
}

module.exports = { notifyAgent };
