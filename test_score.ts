import { calculateSprintFlowScore } from './src/utils/SprintFlowScore';
const data = { sleepHours: 7.5, fatigue: 3, hasPain: false, painDetails: [] };
try {
  console.log(calculateSprintFlowScore(data));
} catch (e) {
  console.error("ERROR:", e);
}
