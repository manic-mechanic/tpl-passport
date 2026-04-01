export function useIsDark() {
  const isDark = ref(false)

  if (import.meta.client) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function update() {
      const theme = document.documentElement.getAttribute('data-theme')
      isDark.value = theme === 'dark' || (theme !== 'light' && mq.matches)
    }

    onMounted(() => {
      update()
      mq.addEventListener('change', update)
      const obs = new MutationObserver(update)
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      onUnmounted(() => {
        mq.removeEventListener('change', update)
        obs.disconnect()
      })
    })
  }

  return isDark
}
