import { defineStore } from 'pinia';

export const useLoggingStore = defineStore('logging', {
  state: () => ({
    actions: [],
  }),
  actions: {
    logEvent(message) {
      const action = {"Action": message, "Time": new Date().toISOString()};
      this.actions.push(action);

      fetch(`http://localhost:${9090}/log`, {
        method: 'POST',
        body: JSON.stringify(action),
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },

    submitFeedback(feedback) {
      const action = {"Action": "Feedback", "Time": new Date().toISOString(), "Feedback": feedback};
      this.actions.push(action);

      fetch(`http://localhost:${9090}/log`, {
        method: 'POST',
        body: JSON.stringify(action),
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },

    submitProblemReport(text) {
      const action = {
        Action: 'ReportProblem',
        Time: new Date().toISOString(),
        Message: text,
      };
      this.actions.push(action);

      fetch(`http://localhost:${9090}/log`, {
        method: 'POST',
        body: JSON.stringify(action),
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  },
});