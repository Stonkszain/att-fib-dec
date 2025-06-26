gsap.registerPlugin(Flip);

const sliders = document.querySelectorAll('input[type="range"]');
const remainingPointsDisplay = document.getElementById('remaining-points');
const remainingPointsContainer = document.getElementById('remaining-points-container');
const treatmentOptionsDisplay = document.getElementById('treatment-options-display');

const MAX_POINTS = 15;

// Define treatment options with their weights for each slider
// Weights are subjective and can be adjusted based on clinical relevance
const treatmentOptions = [
    {
        id: 'rateControl',
        name: 'Rate Control Only (meds to slow HR)',
        description: 'Medications focused on slowing the heart rate to manage symptoms, without aiming to restore normal rhythm.',
        weights: {
            slider1: 3, // Symptom Relief
            slider2: 4, // Avoiding Long-Term Medications (less invasive than rhythm control meds)
            slider3: 2, // Minimizing Stroke Risk (indirectly, if HR is controlled)
            slider4: 5, // Minimizing Risk of Invasive Procedures (very high)
            slider5: 1, // Maintaining Normal Heart Rhythm (low)
            slider6: 3  // Quality of Life and Daily Activity
        }
    },
    {
        id: 'rhythmControlMeds',
        name: 'Rhythm Control with Meds (e.g., amiodarone)',
        description: 'Medications (antiarrhythmics) used to restore and maintain a normal heart rhythm.',
        weights: {
            slider1: 5, // Symptom Relief (high potential)
            slider2: 1, // Avoiding Long-Term Medications (low, requires daily meds)
            slider3: 3, // Minimizing Stroke Risk (if rhythm is maintained)
            slider4: 4, // Minimizing Risk of Invasive Procedures (high, non-invasive)
            slider5: 5, // Maintaining Normal Heart Rhythm (very high)
            slider6: 4  // Quality of Life and Daily Activity
        }
    },
    {
        id: 'electricalCardioversion',
        name: 'Electrical Cardioversion (reset rhythm)',
        description: 'A procedure using electrical shocks to reset the heart to a normal rhythm.',
        weights: {
            slider1: 5, // Symptom Relief (immediate)
            slider2: 3, // Avoiding Long-Term Medications (can be one-off, but often followed by meds)
            slider3: 3, // Minimizing Stroke Risk (if successful)
            slider4: 2, // Minimizing Risk of Invasive Procedures (moderate, it's a procedure)
            slider5: 5, // Maintaining Normal Heart Rhythm (direct aim)
            slider6: 4  // Quality of Life and Daily Activity
        }
    },
    {
        id: 'catheterAblation',
        name: 'Catheter Ablation (procedure to isolate AF triggers)',
        description: 'An invasive procedure to create scar tissue in the heart to block abnormal electrical signals causing AF.',
        weights: {
            slider1: 5, // Symptom Relief (high potential for long-term)
            slider2: 5, // Avoiding Long-Term Medications (high potential to reduce/eliminate meds)
            slider3: 4, // Minimizing Stroke Risk (if successful)
            slider4: 1, // Minimizing Risk of Invasive Procedures (very low, it is invasive)
            slider5: 5, // Maintaining Normal Heart Rhythm (primary goal)
            slider6: 5  // Quality of Life and Daily Activity
        }
    },
    {
        id: 'anticoagulationOnly',
        name: 'Anticoagulation Only (stroke prevention)',
        description: 'Medications (blood thinners) focused solely on preventing blood clots and stroke, without addressing heart rhythm.',
        weights: {
            slider1: 1, // Symptom Relief (low)
            slider2: 2, // Avoiding Long-Term Medications (low, requires daily meds)
            slider3: 5, // Minimizing Stroke Risk (very high)
            slider4: 5, // Minimizing Risk of Invasive Procedures (very high)
            slider5: 1, // Maintaining Normal Heart Rhythm (low)
            slider6: 2  // Quality of Life and Daily Activity
        }
    },
    {
        id: 'laac',
        name: 'Left Atrial Appendage Closure (non-medication stroke prevention, e.g., Watchman device)',
        description: 'A procedure to close off the left atrial appendage, where most stroke-causing clots forms in AF patients.',
        weights: {
            slider1: 1, // Symptom Relief (low)
            slider2: 5, // Avoiding Long-Term Medications (high potential to reduce/eliminate blood thinners)
            slider3: 5, // Minimizing Stroke Risk (very high)
            slider4: 1, // Minimizing Risk of Invasive Procedures (very low, it is invasive)
            slider5: 1, // Maintaining Normal Heart Rhythm (low)
            slider6: 3  // Quality of Life and Daily Activity
        }
    }
];

function updateScore(event) {
    let currentTotal = 0;
    let changedSlider = event ? event.target : null;

    sliders.forEach(slider => {
        if (slider !== changedSlider) {
            currentTotal += parseInt(slider.value);
        }
    });

    if (changedSlider) {
        let potentialNewValue = parseInt(changedSlider.value);
        if (currentTotal + potentialNewValue > MAX_POINTS) {
            changedSlider.value = MAX_POINTS - currentTotal;
        }
    }

    let finalCalculatedTotal = 0;
    sliders.forEach(slider => {
        finalCalculatedTotal += parseInt(slider.value);
        document.getElementById(`${slider.id}-value`).textContent = slider.value;
    });

    remainingPointsDisplay.textContent = MAX_POINTS - finalCalculatedTotal;

    if (MAX_POINTS - finalCalculatedTotal === 0) {
        remainingPointsContainer.classList.remove('text-blue-600');
        remainingPointsContainer.classList.add('text-gray-400');
    } else {
        remainingPointsContainer.classList.remove('text-gray-400');
        remainingPointsContainer.classList.add('text-blue-600');
    }

    displayTreatmentOptions();
}

function displayTreatmentOptions() {
    const currentSliderValues = {};
    sliders.forEach(slider => {
        currentSliderValues[slider.id] = parseInt(slider.value);
    });

    const scoredOptions = treatmentOptions.map(option => {
        let score = 0;
        for (const sliderId in option.weights) {
            score += currentSliderValues[sliderId] * option.weights[sliderId];
        }
        return { ...option, score };
    });

    scoredOptions.sort((a, b) => b.score - a.score); // Sort by score, highest first

    // Capture the state of the elements *before* DOM changes
    const state = Flip.getState(Array.from(treatmentOptionsDisplay.children));

    // Create a map of existing elements by ID for efficient lookup
    const existingElements = new Map();
    Array.from(treatmentOptionsDisplay.children).forEach(child => {
        existingElements.set(child.id, child);
    });

    // Reorder existing elements and create new ones if needed
    const newOrderElements = [];
    if (scoredOptions.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No treatment options available.';
        newOrderElements.push(p);
    } else {
        scoredOptions.forEach(option => {
            let optionDiv = existingElements.get(option.id);
            if (!optionDiv) {
                // Create new element if it doesn't exist
                optionDiv = document.createElement('div');
                optionDiv.id = option.id; // Assign ID for tracking
                optionDiv.className = 'card bg-blue-50 border-4 border-blue-200 shadow-xl p-6 mb-4 rounded-lg';
                optionDiv.innerHTML = `
                    <h3 class="text-xl font-bold mb-2">${option.name}</h3>
                    <p class="text-sm text-gray-700 mb-2">${option.description}</p>
                `;
            }
            newOrderElements.push(optionDiv);
        });
    }

    // Remove elements that are no longer in the scored options
    Array.from(treatmentOptionsDisplay.children).forEach(child => {
        if (!newOrderElements.includes(child)) {
            treatmentOptionsDisplay.removeChild(child);
        }
    });

    // Append elements in the new sorted order
    newOrderElements.forEach(element => {
        treatmentOptionsDisplay.appendChild(element);
    });

    // Animate from the captured state to the new state
    Flip.from(state, {
        duration: 0.5,
        ease: "power1.inOut",
        absolute: true, // Important for reordering elements
        // onEnter and onLeave are typically for elements being added/removed, not just reordered.
        // If you want fade/scale for new/removed items, you can add them back.
    });
}

sliders.forEach(slider => {
    slider.addEventListener('input', updateScore);
});

updateScore(); // Initial display of scores and options