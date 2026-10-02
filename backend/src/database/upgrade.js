const { spawnSync } = require('node:child_process');
const path = require('node:path');
for (const script of ['addPatientDependency.js','addTutorLinkState.js','addNotificationQueue.js','addCalendarUnits.js','addCalendarScope.js','addPatientRegion.js','updateVerifiedSchedules.js','addExternalHistory.js','addPatientRegistration.js','addProductionFeatures.js','addCatchUpRules.js','addAdultVaccinationRules.js']) {
 const result = spawnSync(process.execPath, [path.join(__dirname,script)], { cwd:path.resolve(__dirname,'../..'),stdio:'inherit',windowsHide:true });
 if (result.error) throw result.error;
 if (result.status !== 0) process.exit(result.status || 1);
}
