// Starting-point wording for common home-care instructions. The therapist edits everything before it reaches a patient.
window.CARE_PRESETS = {
  restrictions: [
    { cat: "Weight bearing", text: "No weight on the affected leg (non-weight bearing). Use crutches for all walking." },
    { cat: "Weight bearing", text: "Toe-touch only on the affected leg. Rest your toes down for balance, no weight through it." },
    { cat: "Weight bearing", text: "Partial weight on the affected leg, about half your body weight." },
    { cat: "Weight bearing", text: "Put as much weight on the leg as is comfortable (weight bearing as tolerated)." },
    { cat: "Lifting & reaching", text: "Don't lift anything heavier than 10 lb." },
    { cat: "Lifting & reaching", text: "Don't reach overhead with the affected arm." },
    { cat: "Lifting & reaching", text: "Don't push up from a chair or bed with your arms (sternal precautions)." },
    { cat: "Range of motion", text: "Don't bend the knee past 90°." },
    { cat: "Range of motion", text: "Hip precautions: don't bend your hip past 90°, cross your legs, or turn your knee inward." },
    { cat: "Range of motion", text: "Spine precautions: no bending, lifting, or twisting at the waist." },
    { cat: "Braces & slings", text: "Wear the sling at all times except for exercises, showering, and dressing." },
    { cat: "Braces & slings", text: "Wear the brace whenever you're walking. You can take it off to sleep and for exercises." },
    { cat: "Activity", text: "No driving until your therapist or surgeon clears you." },
    { cat: "Activity", text: "No running, jumping, or cutting until cleared." }
  ],
  care: [
    { cat: "Swelling & pain", title: "Ice", freq: "15–20 min, 3×/day and after exercises", daily: true, detail: "Wrap ice or a cold pack in a thin towel. Never put it directly on skin." },
    { cat: "Swelling & pain", title: "Elevate", freq: "20–30 min, 3×/day", daily: true, detail: "Rest with the injured limb propped above the level of your heart." },
    { cat: "Swelling & pain", title: "Compression", freq: "During the day", daily: true, detail: "Wear the compression sleeve or wrap during the day. Take it off at night or if it feels too tight." },
    { cat: "Swelling & pain", title: "Heat before exercise", freq: "10–15 min before exercises", daily: false, detail: "A warm pack to loosen up before your exercises. Skip heat on a new or swollen injury." },
    { cat: "Swelling & pain", title: "TENS unit", freq: "As needed for pain", daily: false, detail: "Use the TENS unit with the pad placement and settings shown in clinic." },
    { cat: "Movement & positioning", title: "Movement breaks", freq: "Every 30–45 min of sitting", daily: true, detail: "Get up and move around for a couple of minutes." },
    { cat: "Movement & positioning", title: "Ankle pumps", freq: "10 reps every hour while awake", daily: true, detail: "Point and flex your feet to keep blood moving in your legs." },
    { cat: "Movement & positioning", title: "Sleep with a pillow between your knees", freq: "Nightly", daily: false, detail: "Keeps your hips and back lined up while you sleep on your side." },
    { cat: "Movement & positioning", title: "Support the arm at night", freq: "Nightly", daily: false, detail: "Avoid sleeping on the affected side. Rest the arm on a pillow." },
    { cat: "Getting active", title: "Walking program", freq: "10 min daily, add 5 min each week", daily: true, detail: "Easy pace on flat ground. Only add time if pain stays under your limit the next day." },
    { cat: "Getting active", title: "Crutches or walker", freq: "All walking", daily: false, detail: "Use your crutches or walker for all walking until you're cleared to wean off." },
    { cat: "Getting active", title: "Desk setup", freq: "Workdays", daily: false, detail: "Screen at eye level, feet flat, elbows about 90°. Stand or walk during calls when you can." },
    { cat: "Incision & scar", title: "Incision care", freq: "Until cleared", daily: false, detail: "Keep the incision clean and dry. No baths, pools, or hot tubs until cleared." },
    { cat: "Incision & scar", title: "Scar massage", freq: "5 min, 2×/day", daily: true, detail: "Only once the incision is fully closed. Massage along and across the scar with lotion." },
    { cat: "Self-care", title: "Foam rolling", freq: "5 min after training", daily: false, detail: "Roll slowly. Stay off bony spots and the injured area itself." }
  ],
  redflags: [
    "Calf pain, warmth, redness, or swelling in your leg",
    "Fever over 101°F, or redness, drainage, or a bad smell at your incision",
    "New numbness, tingling, or weakness",
    "Loss of bladder or bowel control, or numbness in the groin or inner thighs",
    "Sudden severe pain, a new pop, or the joint giving way",
    "Pain that wakes you at night and doesn't ease when you change position",
    "Swelling that keeps getting worse despite ice and elevation"
  ]
};
