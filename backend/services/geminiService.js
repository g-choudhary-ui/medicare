/**
 * Google Gemini AI Drug-Drug & Food Interaction Service
 * Powered by Google Gemini 2.5 Flash with clinical fallback rulebase.
 */

let GoogleGenAI;
try {
  const genaiModule = require('@google/genai');
  GoogleGenAI = genaiModule.GoogleGenAI;
} catch (e) {
  // If not available, fallback rulebase is used
}

// Built-in clinical knowledge base for common geriatric polypharmacy interactions
const CLINICAL_INTERACTIONS_DB = [
  {
    drugs: ['aspirin', 'warfarin'],
    severity: 'High',
    title: 'Severe Bleeding Risk (Anticoagulant + Antiplatelet)',
    mechanism: 'Additive antihemostatic effects significantly increase the risk of major gastrointestinal and systemic hemorrhages.',
    recommendation: 'Monitor INR closely. Consult prescribing physician regarding gastroprotection (PPI) or dose adjustment.',
  },
  {
    drugs: ['ibuprofen', 'warfarin'],
    severity: 'High',
    title: 'Severe Gastrointestinal Bleeding Risk',
    mechanism: 'NSAIDs displace warfarin from protein-binding sites and damage gastric mucosa.',
    recommendation: 'Avoid concurrent NSAID use. Consider acetaminophen for mild pain relief with physician approval.',
  },
  {
    drugs: ['lisinopril', 'spironolactone'],
    severity: 'High',
    title: 'Hyperkalemia Warning (Potassium Accumulation)',
    mechanism: 'Combined ACE inhibitor and potassium-sparing diuretic effect can elevate serum potassium to cardiotoxic levels.',
    recommendation: 'Regularly monitor serum electrolytes and renal function. Avoid potassium-containing salt substitutes.',
  },
  {
    drugs: ['metformin', 'furosemide'],
    severity: 'Moderate',
    title: 'Altered Metformin Blood Concentration',
    mechanism: 'Furosemide may increase metformin plasma concentrations, while reducing furosemide renal clearance.',
    recommendation: 'Monitor blood glucose levels and watch for signs of lactic acidosis or dehydration.',
  },
  {
    drugs: ['atorvastatin', 'amlodipine'],
    severity: 'Moderate',
    title: 'Increased Statin Exposure',
    mechanism: 'Amlodipine moderately inhibits CYP3A4 metabolism, increasing circulating statin levels.',
    recommendation: 'Limit atorvastatin dose as advised by physician; report muscle pain, weakness, or dark urine immediately.',
  },
  {
    drugs: ['levothyroxine', 'calcium'],
    severity: 'Moderate',
    title: 'Reduced Thyroid Hormone Absorption',
    mechanism: 'Calcium carbonate binds to levothyroxine in the gastrointestinal tract, forming an insoluble chelate.',
    recommendation: 'Separate intake of levothyroxine and calcium supplements by at least 4 hours.',
  },
  {
    drugs: ['clopidogrel', 'omeprazole'],
    severity: 'Moderate',
    title: 'Diminished Antiplatelet Efficacy',
    mechanism: 'Omeprazole strongly inhibits CYP2C19, blocking the bioactivation of clopidogrel into its active metabolite.',
    recommendation: 'Consider alternative H2-receptor antagonists or pantoprazole as directed by physician.',
  },
];

const FOOD_WARNINGS_DB = [
  {
    drugs: ['atorvastatin', 'simvastatin', 'amlodipine'],
    food: 'Grapefruit and Grapefruit Juice',
    severity: 'High',
    effect: 'Inhibits intestinal CYP3A4, leading to dangerously high drug concentrations and rhabdomyolysis risk.',
    instruction: 'Completely avoid grapefruit products while taking this medication.',
  },
  {
    drugs: ['warfarin'],
    food: 'Vitamin K-Rich Leafy Greens (Spinach, Kale, Broccoli)',
    severity: 'High',
    effect: 'Vitamin K directly counters warfarin anticoagulation, lowering INR and increasing clotting risk.',
    instruction: 'Maintain a consistent dietary intake of green leafy vegetables rather than sudden changes.',
  },
  {
    drugs: ['lisinopril', 'losartan', 'enalapril'],
    food: 'Potassium Supplements & Salt Substitutes',
    severity: 'Moderate',
    effect: 'May lead to severe hyperkalemia when combined with renin-angiotensin system inhibitors.',
    instruction: 'Avoid potassium-based sodium-free salt substitutes.',
  },
  {
    drugs: ['levothyroxine'],
    food: 'Soy, High-Fiber Foods, Espresso / Coffee',
    severity: 'Moderate',
    effect: 'Significantly interferes with intestinal absorption of thyroid hormones.',
    instruction: 'Take on an empty stomach with a full glass of water 30-60 minutes before breakfast and coffee.',
  },
  {
    drugs: ['ciprofloxacin', 'levofloxacin', 'doxycycline'],
    food: 'Dairy Products (Milk, Cheese, Yogurt) & Calcium Juices',
    severity: 'Moderate',
    effect: 'Divalent calcium ions bind antibiotics, reducing systemic absorption by up to 50%.',
    instruction: 'Consume dairy at least 2 hours before or 4 hours after taking antibiotic doses.',
  },
];

/**
 * Analyze drug-drug and food interactions using Gemini AI or clinical rulebase
 */
const checkInteractions = async (medications, patientContext = {}) => {
  const medNames = (medications || []).map(m => (typeof m === 'string' ? m : m.name || '').trim().toLowerCase()).filter(Boolean);

  // If Gemini API Key is available, use Google Gemini 2.5 Flash
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert clinical geriatric pharmacologist.
Analyze the following patient medication list and clinical context for elderly drug-drug and drug-food interactions:

Medications:
${medications.map(m => `- ${typeof m === 'string' ? m : `${m.name} (${m.dosage || 'Standard'}, ${m.frequency || ''})`}`).join('\n')}

Patient Conditions: ${patientContext.conditions || 'None reported'}
Known Allergies: ${patientContext.allergies || 'None reported'}

Return a strictly valid JSON object with:
{
  "safetyScore": 85, // 0 to 100 overall safety score
  "riskLevel": "Low" | "Moderate" | "High",
  "summary": "Short 2-sentence clinical summary for caregivers",
  "drugInteractions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "High" | "Moderate" | "Low",
      "title": "Clear concise interaction title",
      "mechanism": "How and why it interacts",
      "recommendation": "Actionable instructions for caregivers and doctors"
    }
  ],
  "foodWarnings": [
    {
      "drug": "Drug Name",
      "food": "Food/Beverage to avoid or monitor",
      "severity": "High" | "Moderate",
      "effect": "Clinical effect",
      "instruction": "What caregiver/patient should do"
    }
  ],
  "elderlyCareTips": [
    "Tip 1: e.g. Stay hydrated",
    "Tip 2: e.g. Take morning doses with meals"
  ]
}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 3500)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        timeoutPromise,
      ]);

      const text = response.text ? response.text() : response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          source: 'Google Gemini 2.5 Flash AI',
          analyzedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('[GeminiService] Gemini API call error, falling back to clinical rules:', err.message);
    }
  }

  // Clinical Rulebase Fallback
  const detectedDrugInteractions = [];
  const detectedFoodWarnings = [];

  // Match Drug-Drug
  for (const rule of CLINICAL_INTERACTIONS_DB) {
    const hasAll = rule.drugs.every(d => medNames.some(m => m.includes(d)));
    if (hasAll) {
      detectedDrugInteractions.push({
        drugs: rule.drugs.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
        severity: rule.severity,
        title: rule.title,
        mechanism: rule.mechanism,
        recommendation: rule.recommendation,
      });
    }
  }

  // Match Food Warnings
  for (const rule of FOOD_WARNINGS_DB) {
    const matchingDrug = rule.drugs.find(d => medNames.some(m => m.includes(d)));
    if (matchingDrug) {
      const actualName = medNames.find(m => m.includes(matchingDrug)) || matchingDrug;
      detectedFoodWarnings.push({
        drug: actualName.charAt(0).toUpperCase() + actualName.slice(1),
        food: rule.food,
        severity: rule.severity,
        effect: rule.effect,
        instruction: rule.instruction,
      });
    }
  }

  // Calculate Safety Score
  let score = 95;
  if (detectedDrugInteractions.some(i => i.severity === 'High')) score -= 35;
  else if (detectedDrugInteractions.length > 0) score -= 15;
  if (detectedFoodWarnings.some(w => w.severity === 'High')) score -= 15;
  else if (detectedFoodWarnings.length > 0) score -= 5;
  score = Math.max(30, Math.min(100, score));

  const riskLevel = score >= 85 ? 'Low' : score >= 65 ? 'Moderate' : 'High';

  return {
    safetyScore: score,
    riskLevel,
    summary:
      detectedDrugInteractions.length > 0
        ? `Identified ${detectedDrugInteractions.length} potential drug-drug interaction(s) and ${detectedFoodWarnings.length} dietary precaution(s). Review with prescribing physician.`
        : detectedFoodWarnings.length > 0
        ? `No severe drug-drug interactions detected. ${detectedFoodWarnings.length} dietary precaution(s) noted for optimal absorption.`
        : 'All active medications show excellent compatibility with no significant adverse interactions detected.',
    drugInteractions: detectedDrugInteractions,
    foodWarnings: detectedFoodWarnings,
    elderlyCareTips: [
      'Ensure a consistent daily water intake to support kidney filtration of medications.',
      'Keep a physical list of all active medications in the wallet for emergency personnel.',
      'Never discontinue prescribed therapies without direct consultation with the physician.',
    ],
    source: 'MediCare Clinical Pharmacology Engine (Gemini-Ready)',
    analyzedAt: new Date().toISOString(),
  };
};

module.exports = {
  checkInteractions,
};
