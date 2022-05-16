<template>
  <div class="start">
    <div>
      <h1>Sign up for Femboy Cup</h1>
    </div>
    <div>
      <p>In this last step, confirm that you understand the tournament rules in <strong>its entirety</strong></p>
    </div>

    <div class="grid">
      <a
        href="/api/finishSignup"
        class="flex button"
      > I agree
      </a>
      <a
        href="/"
        class="flex button"
      > I don't agree
      </a>
    </div>
  </div>
</template>
<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 2rem;
  gap: 5rem;
}
</style>