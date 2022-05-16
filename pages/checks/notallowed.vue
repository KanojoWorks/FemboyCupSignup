<template>
  <div id="start">
    <div>
      <h1>{{ user.osu.displayName }}, you're not allowed to join the tournament. User ID: {{ user.osu.id }}</h1>
      <p>Reason: {{ reason }}</p>
    </div>
  </div>
</template>
<script lang="ts">
import { Context } from "@nuxt/types";
import Vue from "vue";
import { IUser } from "~/server/auth/IUser";
export default Vue.extend({
  asyncData({ req }: Context) {
    if (process.server) {
      const r: any = req;
      const user: IUser = r.session.passport.user;
      const reason = user.failureReason || "Unkown error";
      return { reason, user };
    }
  },
});
</script>