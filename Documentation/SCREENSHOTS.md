# Screenshots

This page documents the full application end-to-end flow using the **ChatGPT** project and **ChatGPT Homepage** test suite. The walkthrough covers creating a test case, executing it in a test run, failing it, and verifying the failure automatically creates a linked ticket.

## 1. Dashboard

![Dashboard](../screenshots/01-dashboard.png)

The dashboard provides an overview of total projects, suites, test cases, activity trends, and recent activity.

## 2. Projects

![Projects](../screenshots/02-projects.png)

The projects page lists all testing projects. The **ChatGPT** project is selected for this walkthrough.

## 3. Test Suites

![Test Suites](../screenshots/03-suites.png)

Inside the ChatGPT project, the test suites page shows available suites. **ChatGPT Homepage** is the suite used throughout this flow.

## 4. Test Cases (List View)

![Test Cases](../screenshots/04-cases.png)

The test cases page lists all cases within the ChatGPT Homepage suite, with ID, title, priority, status, dates, and assignee.

## 5. New Case Creation Form

![New Case Form](../screenshots/05-new-case-form.png)

Clicking "New Case" opens the creation form with fields for title, project, suite, assignee, priority, status, page/area, test description, test steps, expected result, and comments.

## 6. Filled Case Creation Form

![Filled Case Form](../screenshots/06-new-case-filled.png)

The filled form for **Verify ChatGPT homepage loads in desktop browser**, with a description, numbered test steps, and an expected result demonstrating the complete case creation workflow.

## 7. Case Created

![Case Created](../screenshots/07-case-created.png)

The new test case appears at the top of the cases list, ready for execution.

## 8. Test Runs

![Test Runs](../screenshots/08-test-runs.png)

The test runs page lists execution runs for the project, including the **ChatGPT Homepage - Jul-30-2026 09:44** run used in this walkthrough.

## 9. Run Detail

![Run Detail](../screenshots/09-run-detail.png)

The run detail view shows the run metadata (status, pass rate, progress) and the test cases assigned to the run.

## 10. Run Execution

![Run Execution](../screenshots/10-run-execution.png)

Clicking a case row opens the execution panel where each case can be marked **Passed** or **Failed**.

## 11. Tickets (Empty State)

![Tickets](../screenshots/11-tickets.png)

The tickets page for the ChatGPT project initially shows an empty state with a prompt to create the first ticket.

## 12. Ticket Created

![Ticket Created](../screenshots/12-ticket-created.png)

A ticket can also be created manually from the tickets page. The new ticket **Voice input icon missing on mobile homepage** appears in the list with status, priority, severity, and assignee.

## 13. Run Failed

![Run Failed](../screenshots/13-run-failed.png)

When a case is marked **Failed** during execution, the run's pass rate updates accordingly. Note: changing status via the table dropdown does not create a ticket.

## 14. Log a Bug Form

![Log a Bug Form](../screenshots/14-log-bug-form.png)

Failing a case through the **Execute Run** modal opens the "Log a bug" form. The title is pre-filled as `[FAIL] <case title>`, tagged `failed-run`, and automatically linked to the test run. Add the actual result and click **Create ticket & continue**.

## 15. After Bug Logged

![After Bug Logged](../screenshots/15-after-bug-logged.png)

After creating the bug, the case is marked **Failed** with its failure details and actual result recorded against the run.

## 16. Ticket Linked to Run

![Ticket Linked to Run](../screenshots/16-ticket-linked-to-run.png)

The ticket `[FAIL] Voice Input Activation` is created automatically from the failed case and shows its related test run (**ChatGPT Homepage - Jul-30-2026 09:44**) in the ticket details.

## 17. E2E Case Created

![E2E Case Created](../screenshots/17-e2e-case-created.png)

For a complete end-to-end walkthrough, a second case **Verify sidebar search filters chat history** is created with detailed test steps.

## 18. E2E Run Created

![E2E Run Created](../screenshots/18-e2e-run-created.png)

A new test run **ChatGPT Homepage - E2E Search Verification** is created with only the new case. The run starts in **Draft** state with a 0% pass rate.

## 19. E2E Log a Bug Form

![E2E Log a Bug Form](../screenshots/19-e2e-log-bug-form.png)

Executing the run and failing the case opens the "Log a bug" form again, this time with priority set to **High** and severity set to **Major**, demonstrating the full fail-to-ticket workflow.

## 20. E2E Ticket Linked

![E2E Ticket Linked](../screenshots/20-e2e-ticket-linked.png)

The ticket `[FAIL] Verify sidebar search filters chat history` is created and linked to the run **ChatGPT Homepage - E2E Search Verification**, completing the end-to-end flow of case creation → run execution → failure → automated ticket creation.
