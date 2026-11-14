<template>
  <section v-if="pastVisitsHere.length" class="detail-section">
    <h2 class="detail-heading">Your visits here</h2>
    <ul class="visit-list">
      <li v-for="visit in pastVisitsHere" :key="visit.timestamp" class="visit-row-small">
        <div class="visit-row-header">
          <span class="visit-date">{{ formatVisitDate(visit.timestamp) }}</span>
          <div class="visit-actions">
            <label class="visit-action-btn" :title="visit.hasPhoto ? 'Change photo' : 'Add photo'">
              <IconPhoto class="visit-action-icon" />
              <input type="file" accept="image/*" class="visit-file-input" @change="onVisitPhotoCapture($event, visit.timestamp)" />
            </label>
            <button class="visit-action-btn" :title="editingNote === visit.timestamp ? 'Cancel' : 'Edit note'"
                    @click="toggleNoteEdit(visit.timestamp)"
            >
              <IconNote class="visit-action-icon" />
            </button>
          </div>
        </div>
        <button v-if="photoUrls[visit.timestamp]" class="visit-photo-btn"
                @click="lightboxSrc = photoUrls[visit.timestamp]"
        >
          <img :src="photoUrls[visit.timestamp]" class="visit-photo-thumb" alt="Check-in photo" />
        </button>
        <template v-if="editingNote === visit.timestamp">
          <textarea v-model="noteInputs[visit.timestamp]" class="visit-note-input" placeholder="Add a note…" rows="3" />
          <div class="visit-note-actions">
            <button class="note-save-btn" @click="saveNote(visit.timestamp)">Save</button>
            <button class="note-cancel-btn" @click="editingNote = null">Cancel</button>
          </div>
        </template>
        <span v-else-if="visit.note" class="visit-note">{{ visit.note }}</span>
      </li>
    </ul>
  </section>

  <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = null">
    <img :src="lightboxSrc" class="lightbox-img" alt="Check-in photo" />
  </div>
</template>

<script setup>
import { usePassportStore } from '~/stores/passport'
import { getPhotoUrl, savePhoto } from '~/composables/usePhotoStore'
import { compressPhoto, uploadCheckInPhoto } from '~/lib/checkInPhoto'
import { canSyncToServer } from '~/composables/useAuthState'
import IconNote from './icons/IconNote.vue'
import IconPhoto from './icons/IconPhoto.vue'

// "Your visits here" list on a branch page: photos, a lightbox, and note editing.
const props = defineProps({
  branchCode: { type: String, required: true },
})

const passport = usePassportStore()

const pastVisitsHere = computed(() =>
  passport.checkIns.filter(c => c.branchCode === props.branchCode)
)

const photoUrls = ref({})
const lightboxSrc = ref(null)

watch(pastVisitsHere, async (visits) => {
  for (const visit of visits) {
    if (visit.timestamp in photoUrls.value) continue
    photoUrls.value[visit.timestamp] = null
    photoUrls.value[visit.timestamp] = await getPhotoUrl(visit.timestamp)
  }
}, { immediate: true })

onUnmounted(() => {
  Object.values(photoUrls.value).forEach(url => url && URL.revokeObjectURL(url))
})

function formatVisitDate(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Note editing
const editingNote = ref(null)
const noteInputs = ref({})

function toggleNoteEdit(timestamp) {
  if (editingNote.value === timestamp) {
    editingNote.value = null
  } else {
    noteInputs.value[timestamp] = pastVisitsHere.value.find(v => v.timestamp === timestamp)?.note ?? ''
    editingNote.value = timestamp
  }
}

function saveNote(timestamp) {
  passport.updateNote(timestamp, noteInputs.value[timestamp] ?? '')
  editingNote.value = null
}

// Photo adding on existing visits
async function onVisitPhotoCapture(event, timestamp) {
  const file = event.target.files?.[0]
  if (!file) return
  const blob = await compressPhoto(file)
  if (!blob) return
  await savePhoto(timestamp, blob)
  const oldUrl = photoUrls.value[timestamp]
  if (oldUrl) URL.revokeObjectURL(oldUrl)
  photoUrls.value[timestamp] = URL.createObjectURL(blob)
  passport.markCheckInHasPhoto(timestamp)
  if (canSyncToServer()) {
    const publicUrl = await uploadCheckInPhoto(blob)
    if (publicUrl) passport.markCheckInHasPhoto(timestamp, publicUrl)
  }
}
</script>

<style scoped>
.detail-section {
  margin-bottom: 24px;
}

.detail-heading {
  font-size: 1rem;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.visit-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.visit-row-small {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-soft);
  border-radius: var(--radius-sm);

  & .visit-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  & .visit-note {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
}

.visit-photo-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
  width: 100%;
  margin-top: 8px;
}

.visit-photo-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.visit-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.visit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.visit-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;

  &:hover { background: var(--color-border-soft); }
}

.visit-action-icon {
  width: 14px;
  height: 14px;
  stroke: var(--color-text-muted);
  flex-shrink: 0;
}

.visit-file-input {
  display: none;
}

.visit-note-input {
  width: 100%;
  padding: 8px 10px;
  margin-top: 8px;
  font-size: 0.875rem;
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
  line-height: 1.5;
  box-sizing: border-box;

  &:focus { border-color: var(--tpl-blue); }
}

.visit-note-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.note-save-btn {
  padding: 5px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--font-body);
  background: var(--tpl-blue);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.note-cancel-btn {
  padding: 5px 14px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-body);
  background: none;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
</style>
