# Requirements Document

## Introduction

A personal dashboard web application designed to run as a browser new-tab page or standalone web page. The dashboard provides a daily productivity hub: a greeting with real-time clock, a Pomodoro focus timer, a to-do list, quick-access links to favorite websites, and a light/dark mode toggle. All data is persisted client-side via the browser's Local Storage. The application is built with HTML, CSS, and Vanilla JavaScript only — no frameworks or build tools — and must run in modern browsers (Chrome, Firefox, Edge, Safari).

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI area displaying the current time, date, and a personalized greeting message.
- **Timer_Widget**: The UI area containing the Pomodoro countdown timer and its controls.
- **Todo_Widget**: The UI area containing the task list and its controls.
- **Links_Widget**: The UI area containing configurable quick-access link buttons.
- **Settings_Panel**: The UI overlay or section where the user configures the custom name and Pomodoro duration.
- **Storage**: The browser's Local Storage API used for all client-side data persistence.
- **Theme**: The visual color scheme of the Dashboard, either "light" or "dark".
- **Task**: A text item in the Todo_Widget that can be added, edited, marked as done, or deleted.
- **Quick_Link**: A saved URL and label pair rendered as a clickable button in the Links_Widget.
- **Pomodoro_Duration**: The configurable countdown length for the Timer_Widget, defaulting to 25 minutes.
- **User_Name**: A configurable string stored in Storage and displayed in the Greeting_Widget.

---

## Requirements

### Requirement 1: Real-Time Greeting

**User Story:** As a user, I want to see the current time, date, and a contextual greeting when I open the dashboard, so that I am immediately oriented and welcomed.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM (24-hour) format, updating at the start of each new minute (i.e., when the seconds value resets to 00).
2. THE Greeting_Widget SHALL display the current local date in the format: full weekday name, day of month (no leading zero), full month name, and four-digit year (e.g., Monday, 14 July 2025).
3. WHEN the local time is between 05:00 and 11:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good morning".
4. WHEN the local time is between 12:00 and 16:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good afternoon".
5. WHEN the local time is between 17:00 and 20:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good evening".
6. WHEN the local time is between 21:00 and 23:59 inclusive, or between 00:00 and 04:59 inclusive, THE Greeting_Widget SHALL display the greeting "Good night".
7. WHEN a User_Name has been saved in Storage, THE Greeting_Widget SHALL append the User_Name to the greeting separated by a comma and a single space (e.g., "Good morning, Alex"), where User_Name is a non-empty string of at most 50 characters.
8. WHEN no User_Name has been saved in Storage, THE Greeting_Widget SHALL display the greeting without a name suffix.
9. WHEN the dashboard is opened, THE Greeting_Widget SHALL display the current time, date, and greeting within 1 second of the page becoming interactive.

---

### Requirement 2: Custom Name Configuration

**User Story:** As a user, I want to set my name so that the greeting on the dashboard feels personal.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide a text input field for the user to enter a User_Name, accepting a maximum of 50 characters.
2. WHEN the user submits a non-empty User_Name, THE Dashboard SHALL save the User_Name to Storage within 500 milliseconds.
3. WHEN the user submits a non-empty User_Name, THE Greeting_Widget SHALL reflect the updated User_Name within 500 milliseconds without requiring a page reload.
4. WHEN the user clears the User_Name input and submits, THE Dashboard SHALL remove the User_Name from Storage and THE Greeting_Widget SHALL display the greeting without a name suffix within 500 milliseconds.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the User_Name from Storage and populate the Settings_Panel input field with the saved value within 1000 milliseconds.
6. IF the user submits a User_Name exceeding 50 characters, THEN THE Settings_Panel SHALL reject the input and display an error message indicating the character limit has been exceeded, without saving to Storage.
7. IF Storage is unavailable when saving or reading the User_Name, THEN THE Dashboard SHALL display an error message indicating the name could not be saved or loaded, and THE Greeting_Widget SHALL display the greeting without a name suffix.

---

### Requirement 3: Pomodoro Focus Timer

**User Story:** As a user, I want a configurable countdown timer following the Pomodoro technique, so that I can manage focused work sessions.

#### Acceptance Criteria

1. THE Timer_Widget SHALL display a countdown in MM:SS format, initialized to the current Pomodoro_Duration, where Pomodoro_Duration is between 1 and 99 minutes inclusive.
2. WHEN the user activates the Start control and the timer is not currently counting down, THE Timer_Widget SHALL begin counting down one second per second.
3. WHILE the timer is counting down, THE Timer_Widget SHALL update the displayed MM:SS value every second.
4. WHEN the user activates the Stop control and the timer is currently counting down, THE Timer_Widget SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Start control after a Stop, THE Timer_Widget SHALL resume the countdown from the retained remaining time.
6. WHEN the user activates the Reset control, THE Timer_Widget SHALL stop any active countdown and reset the displayed time to the current Pomodoro_Duration.
7. WHEN the countdown reaches 00:00, THE Timer_Widget SHALL stop counting, display a visible on-screen alert within the widget, and emit a browser notification.
8. THE Timer_Widget SHALL display Start, Stop, and Reset as three separate, individually labeled controls.

---

### Requirement 4: Pomodoro Duration Configuration

**User Story:** As a user, I want to change the Pomodoro timer duration, so that I can adapt the focus session length to my working style.

#### Acceptance Criteria

1. THE Settings_Panel SHALL provide a numeric input field for the Pomodoro_Duration, accepting integer values between 1 and 120 minutes inclusive, in steps of 1 minute.
2. WHEN the user saves a valid Pomodoro_Duration, THE Dashboard SHALL persist the value to Storage; IF the Storage write fails, THEN THE Settings_Panel SHALL display an error message indicating the value could not be saved and SHALL retain the previously active duration.
3. WHEN the user saves a valid Pomodoro_Duration and the timer is not running, THE Timer_Widget SHALL immediately update the displayed time to the new Pomodoro_Duration.
4. WHEN the user saves a valid Pomodoro_Duration and the timer is currently running, THE Timer_Widget SHALL continue the active countdown uninterrupted and apply the new duration the next time the timer is reset to its initial state by the user or by a session completion event.
5. IF the user enters a Pomodoro_Duration outside the range 1–120 or enters a non-integer value, THEN THE Settings_Panel SHALL display an inline validation error message indicating the valid range and SHALL NOT save the invalid value to Storage.
6. WHEN the Dashboard loads and Storage contains a valid Pomodoro_Duration, THE Dashboard SHALL initialize the Timer_Widget with that stored value; IF the stored Pomodoro_Duration is absent or is not an integer within the range 1–120, THEN THE Dashboard SHALL initialize the Timer_Widget with a default duration of 25 minutes.

---

### Requirement 5: To-Do List — Add and Persistence

**User Story:** As a user, I want to add tasks to a to-do list that persists across page reloads, so that I can track my work without losing data.

#### Acceptance Criteria

1. THE Todo_Widget SHALL provide a text input field accepting up to 200 characters and an Add control for creating new Tasks.
2. WHEN the user submits a non-empty task text of 1 to 200 characters, THE Todo_Widget SHALL add the Task to the list, clear the input field, and save the updated list to Storage within 1 second.
3. IF the user submits a task text that is identical (case-insensitive) to an existing Task in the list, THEN THE Todo_Widget SHALL display an inline duplicate warning and SHALL NOT add the Task.
4. IF the user submits an empty task text, THEN THE Todo_Widget SHALL NOT add a Task and SHALL display an inline validation message indicating that the task text cannot be empty.
5. IF the user enters more than 200 characters in the task input field, THEN THE Todo_Widget SHALL NOT add the Task and SHALL display an inline validation message indicating the 200-character limit.
6. WHEN the Dashboard loads, THE Todo_Widget SHALL read the task list from Storage and render all saved Tasks within 2 seconds.
7. IF Storage is unavailable when the Dashboard loads, THEN THE Todo_Widget SHALL render an empty task list and display an inline error message indicating that saved tasks could not be loaded.

---

### Requirement 6: To-Do List — Edit, Complete, and Delete

**User Story:** As a user, I want to edit, mark done, and delete tasks, so that I can manage the state of my to-do list accurately.

#### Acceptance Criteria

1. THE Todo_Widget SHALL display an Edit control for each Task.
2. WHEN the user activates the Edit control for a Task, THE Todo_Widget SHALL replace the Task label with an editable text field pre-populated with the current task text, with the cursor positioned at the end of the text.
3. WHILE a Task is in edit mode, THE Todo_Widget SHALL provide a Save control and a Cancel control to confirm or discard the edit.
4. WHEN the user activates the Cancel control for a Task in edit mode, THE Todo_Widget SHALL discard the changes and restore the Task label with the original task text.
5. WHEN the user saves an edited Task with non-empty text of 1 to 500 characters, THE Todo_Widget SHALL update the Task text in the list and in Storage, and restore the Task label.
6. IF the user saves an edited Task with empty text, THEN THE Todo_Widget SHALL display an inline validation message indicating that the task text cannot be empty and SHALL NOT update the Task or close the edit field.
7. IF Storage is unavailable when saving an edited Task, THEN THE Todo_Widget SHALL display an error message indicating the save failed and SHALL retain the edited text in the input field.
8. THE Todo_Widget SHALL display a completion toggle for each Task.
9. WHEN the user activates the completion toggle for an incomplete Task, THE Todo_Widget SHALL mark the Task as complete by applying a strikethrough style to the Task label and save the updated state to Storage.
10. WHEN the user activates the completion toggle for a complete Task, THE Todo_Widget SHALL restore the Task to its incomplete state by removing the strikethrough style from the Task label and save the updated state to Storage.
11. IF Storage is unavailable when saving a completion state change, THEN THE Todo_Widget SHALL display an error message indicating the save failed and SHALL revert the Task to its previous completion state.
12. THE Todo_Widget SHALL display a Delete control for each Task.
13. WHEN the user activates the Delete control for a Task, THE Todo_Widget SHALL remove the Task from the list and from Storage.
14. IF Storage is unavailable when deleting a Task, THEN THE Todo_Widget SHALL display an error message indicating the deletion failed and SHALL retain the Task in the list.

---

### Requirement 7: To-Do List — Sorting

**User Story:** As a user, I want to sort my task list, so that I can prioritize and view tasks in a meaningful order.

#### Acceptance Criteria

1. THE Todo_Widget SHALL provide a sort control offering at minimum the following sort options: "Default (creation order)", "Alphabetical (A–Z)", and "Completed last".
2. WHEN the user selects a sort option, THE Todo_Widget SHALL re-render the task list in the chosen order without altering the underlying data in Storage.
3. THE Todo_Widget SHALL preserve the selected sort option for the duration of the page session; WHEN the page session ends, THE Todo_Widget SHALL revert to "Default (creation order)" on the next page load.
4. WHEN tasks tie under the selected sort option (e.g., all tasks are incomplete under "Completed last"), THE Todo_Widget SHALL render those tasks in creation order as a tiebreaker.

---

### Requirement 8: Quick Links

**User Story:** As a user, I want to save and access my favorite website links from the dashboard, so that I can navigate to them quickly.

#### Acceptance Criteria

1. THE Links_Widget SHALL display each saved Quick_Link as a labeled button.
2. WHEN the user activates a Quick_Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
3. THE Links_Widget SHALL provide controls to add a new Quick_Link by entering a label (maximum 50 characters) and a URL (maximum 2048 characters).
4. WHEN the user submits a new Quick_Link with a non-empty label and a valid URL, THE Links_Widget SHALL save the Quick_Link to Storage and render it as a button within the existing list.
5. IF the user submits a Quick_Link with an empty label or an empty URL, THEN THE Links_Widget SHALL display an inline validation message and SHALL NOT save the Quick_Link.
6. IF the user submits a label exceeding 50 characters or a URL exceeding 2048 characters, THEN THE Links_Widget SHALL display an inline validation message indicating the exceeded limit and SHALL NOT save the Quick_Link.
7. IF the user submits a URL that does not begin with "http://" or "https://", THEN THE Links_Widget SHALL prepend "https://" to the URL before saving.
8. THE Links_Widget SHALL provide a Delete control for each Quick_Link.
9. WHEN the user activates the Delete control for a Quick_Link, THE Links_Widget SHALL remove the Quick_Link from the rendered list and from Storage immediately, without requiring a confirmation prompt.
10. WHEN the Dashboard loads, THE Links_Widget SHALL read Quick_Links from Storage and render all saved Quick_Links as buttons within 2 seconds.
11. IF Storage is unavailable when the Dashboard loads, THEN THE Links_Widget SHALL render an empty links list and display an inline error message indicating that saved links could not be loaded.
12. IF Storage is unavailable when saving a new Quick_Link, THEN THE Links_Widget SHALL display an error message indicating the save failed and SHALL NOT render the new button.

---

### Requirement 9: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and dark visual theme, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme toggle control that is visible without scrolling on the main page and displays the currently active Theme name or icon indicating "light" or "dark".
2. WHEN the user activates the Theme toggle, THE Dashboard SHALL switch the active Theme from "light" to "dark" or from "dark" to "light".
3. WHEN the Theme changes, THE Dashboard SHALL apply the new Theme styles to all UI areas within 100 milliseconds without a page reload.
4. WHEN the user sets a Theme, THE Dashboard SHALL save the selected Theme to Storage.
5. WHEN the Dashboard loads, THE Dashboard SHALL read the Theme from Storage and apply it before rendering visible content, completing this operation within 50 milliseconds to prevent a flash of the wrong theme.
6. IF no Theme is stored, THEN THE Dashboard SHALL apply "light" as the default Theme.
7. IF Storage is unavailable or returns an unrecognized value when the Dashboard loads, THEN THE Dashboard SHALL apply "light" as the default Theme and continue loading normally.

---

### Requirement 10: File and Asset Structure

**User Story:** As a developer, I want the project files to follow a clean, conventional structure, so that the codebase is easy to maintain and extend.

#### Acceptance Criteria

1. THE Dashboard SHALL be delivered as a single HTML entry point named `index.html` located at the project root directory, containing valid HTML5 doctype and structure.
2. THE Dashboard SHALL contain exactly one CSS file located inside a `css/` directory at the project root, and the `index.html` file SHALL reference this CSS file using a relative path.
3. THE Dashboard SHALL contain exactly one JavaScript file located inside a `js/` directory at the project root, and the `index.html` file SHALL reference this JavaScript file using a relative path.
4. THE Dashboard SHALL not depend on any external JavaScript frameworks, CSS frameworks, or build tools, such that all required JavaScript and CSS are contained within the files described in criteria 2 and 3, with no `<script>` or `<link>` tags referencing external URLs or CDN-hosted resources.
5. WHEN the `index.html` file is opened via a local file path (using a `file://` URI) or served from a static HTTP server, THE Dashboard SHALL render all UI components and execute all functionality correctly in the latest stable release of Chrome, Firefox, Edge, and Safari, without requiring any backend server process.
6. IF the `css/` directory contains more than one CSS file or the `js/` directory contains more than one JavaScript file, THEN THE Dashboard SHALL be considered non-conformant with this requirement.

---

### Requirement 11: Performance and Responsiveness

**User Story:** As a user, I want the dashboard to load and respond quickly, so that it does not slow down my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL render all widgets and apply the saved Theme within 500ms of the page load event on a modern desktop device, measured from the page load event to the last widget becoming visible and interactive with the correct Theme applied.
2. WHEN the user interacts with any control (button, input, toggle), THE Dashboard SHALL reflect the updated UI state within 100ms, where UI state change is defined as the control visually reflecting the new value or selection.
3. THE Dashboard SHALL remain fully functional and visually consistent at viewport widths from 320px to 2560px, where fully functional means all controls are operable and no content is clipped or obscured.
4. IF the Dashboard fails to render all widgets within 500ms of the page load event, THEN THE Dashboard SHALL display a loading indicator for each widget that has not yet rendered, and each such widget SHALL complete rendering within 5000ms or display an error message indicating the widget failed to load.
5. WHEN the user resizes the viewport to any width between 320px and 2560px, THE Dashboard SHALL reflow and re-render all widgets within 300ms of the resize event completing.
