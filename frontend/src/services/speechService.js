/**
 * MediCare Voice Schedule Companion
 * Powered by browser native Web Speech API (speechSynthesis)
 * Runs 100% locally and offline with zero external audio assets.
 */

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    this.currentUtterance = null
  }

  isSupported() {
    return !!this.synth
  }

  stop() {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  speak(text, onEnd = null) {
    if (!this.synth) return false

    // Cancel any active speech
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    this.currentUtterance = utterance

    // Preferred elderly-friendly settings: slightly slower, reassuring cadence
    utterance.rate = 0.92
    utterance.pitch = 1.0

    // Choose natural voice if available
    const voices = this.synth.getVoices()
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.lang.startsWith('en')) &&
        !v.name.includes('Zira')
    )
    if (naturalVoice) {
      utterance.voice = naturalVoice
    }

    if (onEnd) {
      utterance.onend = onEnd
      utterance.onerror = onEnd
    }

    this.synth.speak(utterance)
    return true
  }

  speakSchedule(patientName, medications = [], appointments = []) {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const name = patientName || 'Loved One'

    const activeMeds = medications.filter((m) => m.isActive !== false)

    let speechText = `${greeting}, ${name}. Here is your health schedule for today. `

    if (activeMeds.length === 0) {
      speechText += `You have no medications scheduled right now. Have a peaceful day. `
    } else {
      speechText += `You have ${activeMeds.length} scheduled medication${activeMeds.length > 1 ? 's' : ''}. `
      activeMeds.forEach((med, idx) => {
        const timesStr = (med.times || []).join(' and ') || 'daily'
        speechText += `Number ${idx + 1}: ${med.name}, ${med.dosage || ''}, to be taken in the ${timesStr}. `
        if (med.instructions) {
          speechText += `Special instruction: ${med.instructions}. `
        }
      })
    }

    if (appointments && appointments.length > 0) {
      speechText += `Also, you have an upcoming doctor appointment with ${appointments[0].doctorName} for ${appointments[0].specialty}. `
    }

    speechText += `Stay healthy and hydrated!`
    return this.speak(speechText)
  }
}

export const speechService = new SpeechService()
