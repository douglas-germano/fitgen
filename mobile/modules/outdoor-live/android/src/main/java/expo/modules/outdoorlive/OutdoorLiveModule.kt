package expo.modules.outdoorlive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val WORKOUT_CHANNEL = "fitgen-workout-live"
private const val WORKOUT_NOTIFICATION = 1
private const val MAX_WORKOUT_MS = 8 * 60 * 60 * 1000L

class OutdoorLiveModule : Module() {
  private val main = Handler(Looper.getMainLooper())
  private val restCallbacks = mutableMapOf<String, Runnable>()

  override fun definition() = ModuleDefinition {
    Name("OutdoorLive")

    AsyncFunction("publish") {
      _: String, title: String, _: String, timerStart: Double?,
      _: String, distance: String, rate: String, _: Boolean ->
      if (timerStart == null) false else publish(title, timerStart.toLong(), distance, rate)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("publishWorkout") {
      id: String, title: String, detail: String, progress: String,
      timerStart: Double, restEnd: Double?, url: String, _: Boolean ->
      publishWorkout(id, title, detail, progress, timerStart.toLong(), restEnd?.toLong(), url)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("end") { id: String ->
      restCallbacks.remove(id)?.let(main::removeCallbacks)
      // The outdoor notification belongs to expo-location and stops with its GPS service.
      appContext.reactContext?.getSystemService(NotificationManager::class.java)
        ?.cancel(workoutTag(id), WORKOUT_NOTIFICATION)
      Unit
    }.runOnQueue(Queues.MAIN)
  }

  private fun publish(title: String, timerStart: Long, distance: String, rate: String): Boolean {
    val context = appContext.reactContext ?: return false
    val manager = context.getSystemService(NotificationManager::class.java) ?: return false
    if (!manager.areNotificationsEnabled()) return false

    // Discover the current service notification instead of depending on Expo's process-local ID.
    // Checking the channel and foreground-service flag confines updates to the outdoor GPS task.
    val current = manager.activeNotifications.firstOrNull {
      it.tag == null && it.notification.channelId.endsWith(":fitgen-outdoor-location") &&
        (it.notification.flags and Notification.FLAG_FOREGROUND_SERVICE) != 0
    } ?: return false

    val content = if (rate == "—") distance else "$distance · $rate"
    val builder = liveBuilder(context, current.notification.channelId, title, timerStart, "fitgen:///outdoor", current.id)
      .setSmallIcon(current.notification.smallIcon)
      .setContentText(content)
    return try {
      manager.notify(current.id, builder.build())
      true
    } catch (_: SecurityException) {
      false
    }
  }

  private fun publishWorkout(
    id: String, title: String, detail: String, progress: String,
    timerStart: Long, restEnd: Long?, url: String
  ) {
    restCallbacks.remove(id)?.let(main::removeCallbacks)
    val context = appContext.reactContext ?: return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    val now = System.currentTimeMillis()
    val remaining = timerStart + MAX_WORKOUT_MS - now
    if (!manager.areNotificationsEnabled() || remaining <= 0) return

    manager.createNotificationChannel(
      NotificationChannel(WORKOUT_CHANNEL, "Treino em andamento", NotificationManager.IMPORTANCE_LOW)
    )
    val rest = restEnd?.takeIf { it > now }
    val body = if (rest == null) detail else "Descanso · $detail"
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_media_play
    val builder = liveBuilder(context, WORKOUT_CHANNEL, title, rest ?: timerStart, url, WORKOUT_NOTIFICATION)
      .setSmallIcon(icon)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setSubText(progress)
      .setChronometerCountDown(rest != null)
      .setTimeoutAfter(remaining)

    try {
      manager.notify(workoutTag(id), WORKOUT_NOTIFICATION, builder.build())
    } catch (_: SecurityException) {
      return
    }

    if (rest != null) {
      val callback = Runnable { publishWorkout(id, title, detail, progress, timerStart, null, url) }
      restCallbacks[id] = callback
      main.postDelayed(callback, rest - now)
    }
  }

  private fun workoutTag(id: String) = "fitgen-workout:$id"

  private fun liveBuilder(
    context: Context, channel: String, title: String, timerStart: Long, url: String, requestCode: Int
  ): Notification.Builder {
    val builder = Notification.Builder(context, channel)
      .setContentTitle(title)
      .setCategory(if (Build.VERSION.SDK_INT >= 31) Notification.CATEGORY_WORKOUT else Notification.CATEGORY_SERVICE)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setWhen(timerStart)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)

    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
      launch.action = Intent.ACTION_VIEW
      launch.data = Uri.parse(url)
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
      builder.setContentIntent(PendingIntent.getActivity(
        context, requestCode, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      ))
    }

    if (Build.VERSION.SDK_INT >= 36) {
      builder.addExtras(Bundle().apply {
        putBoolean(Notification.EXTRA_REQUEST_PROMOTED_ONGOING, true)
      })
    }
    return builder
  }
}
