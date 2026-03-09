# Encounter System Implementation Plan: Dialogue-Based Wild Pet Interaction

This document outlines the roadmap for upgrading the current single-question wild animal popup into an immersive, character-driven **Encounter System**.

---

## 1. Feature Goal
The **Encounter System** aims to replace the existing "quiz-only" popup with a narrative sequence. By introducing interactive dialogue, we build unique personalities for each animal (e.g., the snobbish cat, the energetic rabbit), making the capture process feel like a social bond rather than a test. This deepens the "cozy" atmosphere and increases player engagement with the educational content.

## 2. UX Flow
1.  **Trigger**: Player clicks a roaming wild animal on the farm.
2.  **Entry**: The farm background blurs; the Encounter UI fades in.
3.  **Dialogue Sequence**: A 3-4 line conversation begins. The animal and player exchange lines (e.g., a pig asking for snacks).
4.  **Progression**: The player taps a large "Next" button to advance the dialogue.
5.  **Challenge Phase**: The final line of dialogue leads naturally into a question (e.g., "Help me fix this sign!").
6.  **Resolution**: The player answers the question using the existing quiz mechanics.
7.  **Outcome**:
    *   **Success**: Heart animations, happy "Join" dialogue, and the animal is added to the Ranch.
    *   **Failure**: "Goodbye" dialogue, a dust cloud animation, and the animal vanishes.

## 3. UI Layout Plan (Project Consistent)
*   **Modal Structure**: Uses the standard `.modalBox` (Brown #B8783F) and `.modalHeader` (Tan #D3B58D) containers.
*   **Background Layer**: Standard `backdrop-filter: blur(3px)` overlay to keep the focus on the interaction.
*   **Header Area**: Includes the existing `#modalTitle` (Bungee font with #8A6A6A stroke) and the red circular `.modalClose` button.
*   **Inner Content Area**: Uses the `#modalContent` (Cream #FCF6EA) with rounded bottom corners (10px).
*   **Title Area**: Uses the standard `#modalTitle` with text like "Encounter: [Animal Name]".
*   **Progress Indicator**: A segmented bar at the top of the `#modalContent`, styled to match the project's HP/XP bars (using linear gradients).
*   **Dialogue Bubble Section**: 
    *   *Player*: Left-aligned bubbles using the project's `--planted1` (soft green) color.
    *   *Animal*: Right-aligned bubbles using the project's `--paper` (white/cream) color with a #D3B58D border.
*   **Speaker Icons**: Circular frames for the animal's `headimage` and the player's avatar.
*   **Next Button**: Standard project buttons (Tan #D3B58D with #fff text and rounded corners).
*   **Answer Section**: Vertical choice buttons that replace the "Next" button during the Challenge Phase.

## 4. Component Breakdown
*   **Encounter Modal**: The main container for the system.
*   **Dialogue Bubble Component**: A template with logic for alternating speaker styles.
*   **Portrait Component**: Handles circular framing and "pop" animations for speakers.
*   **Progress Bar**: A dynamic CSS element.
*   **Question Card**: Integrates the existing `renderQuestionUI` into the encounter layout.
*   **Encounter Data Handler**: A system in `wildPetEntity.js` that pulls from an `ENCOUNTER_BANK`.

## 5. State Flow
*   `IDLE`: Waiting for player click.
*   `OPENING`: Animating the modal into view.
*   `DIALOGUE_ACTIVE`: Displaying speech bubbles and waiting for "Next".
*   `QUESTION_ACTIVE`: Displaying the educational challenge.
*   `SUBMITTED`: Evaluating the answer.
*   `SUCCESS_RESULT`: Playing capture animations and "Victory" dialogue.
*   `FAILURE_RESULT`: Playing "Escape" dialogue and clearing the entity.
*   `CLOSING`: Returning to the farm screen.

## 6. Content Structure
```javascript
{
  animalId: "pig",
  script: [
    { speaker: "animal", text: "Oink! Are those premium carrots?" },
    { speaker: "player", text: "I grow only the best for my friends!" },
    { speaker: "animal", text: "Friends? Prove you're a real farmer first!" }
  ],
  challenge: {
    type: "Grammar",
    question: "Which word is an adjective: 'Quickly', 'Big', or 'Run'?",
    answer: "Big"
  },
  successText: "Delicious! I'm moving in!",
  failureText: "Those carrots look fake... I'm out of here!"
}
```

## 7. Dialogue Design Rules
*   **Reflect Personality**: Use "Oinks," "Purrs," and character-specific traits (e.g., Snakes hiss).
*   **The Narrative Bridge**: The last line must justify the question (e.g., "Help me read this map," "Check my spelling").
*   **Cozy Language**: Maintain a friendly, non-punitive tone.

## 8. Interaction Rules
*   **Advance**: Tapping the "Next" button or the dialogue area advances one step.
*   **Transition**: Use a subtle "slide-in" or "fade-in" for new speech bubbles.
*   **Locking**: Input is disabled during evaluation (the 1-2 seconds after answering).

## 9. Visual Design Guidance (Project Consistent)
*   **Aesthetic**: "Cat Farm" signature cozy/rustic style.
*   **Color Palette**: Strictly follow established variables:
    *   Outer Frame: #B8783F (Brown)
    *   Header: #D3B58D (Tan)
    *   Inner Paper: #FCF6EA (Cream)
    *   Text: #3d2a16 (Dark Ink)
*   **Typography**: 
    *   Titles/Headings: `Bungee` (with white fill and brown stroke)
    *   Dialogue/UI: `ArialRounded`
*   **Shapes**: 18px radius for outer modal, 10px for content area and buttons.
*   **Transitions**: Maintain the `0.35s ease` standard for UI appearance.

## 10. Technical Planning
*   **Modular Subject System**: Allow the `challenge` to be swapped between Grammar, Math, or Vocabulary easily.
*   **Encounter Bank**: Store scripts in a separate file for easy scaling.
*   **Rarity Scaling**: Legendary animals have longer scripts and harder questions.

## 11. Edge Cases
*   **Mid-Dialogue Close**: The animal should remain on the farm (paused) if the user accidentally closes the modal.
*   **Text Overflow**: Long dialogue should be scrollable within the bubble area.
*   **Data Missing**: Fallback to a generic "Hello!" script if specific data is missing.

## 12. Final Build Order
1.  **Stage 1 (UI Scaffolding)**: Implement the basic Encounter Modal with static bubbles and avatars.
2.  **Stage 2 (Logic Loop)**: Build the "Next" button progression and progress bar.
3.  **Stage 3 (Challenge Integration)**: Bridge the encounter flow with the existing `renderQuestionUI`.
4.  **Stage 4 (Content)**: Create the `ENCOUNTER_BANK` with unique scripts for all 13 current animals.
5.  **Stage 5 (VFX/Polish)**: Add heart particles, bounce animations, and character-specific sound effects.
