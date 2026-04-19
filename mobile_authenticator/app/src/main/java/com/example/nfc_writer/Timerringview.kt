package com.example.nfc_writer

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View

/**
 * A simple circular ring that depletes as time passes.
 * Call setProgress(fraction) where fraction is 1.0 → full, 0.0 → empty.
 */
class TimerRingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var progress: Float = 1f  // 0.0 – 1.0

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = 0x33FFFFFF  // translucent white track
        strokeCap = Paint.Cap.ROUND
    }

    private val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = 0xFFFFFFFF.toInt()
        strokeCap = Paint.Cap.ROUND
    }

    private val oval = RectF()

    fun setProgress(fraction: Float) {
        progress = fraction.coerceIn(0f, 1f)
        // Colour shifts from white → pink when < 20 % remaining
        arcPaint.color = if (progress < 0.2f) 0xFFFF80AB.toInt() else 0xFFFFFFFF.toInt()
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val strokeWidth = width * 0.09f
        trackPaint.strokeWidth = strokeWidth
        arcPaint.strokeWidth  = strokeWidth

        val inset = strokeWidth / 2f
        oval.set(inset, inset, width - inset, height - inset)

        // Background track (full circle)
        canvas.drawArc(oval, -90f, 360f, false, trackPaint)

        // Foreground arc (depleting)
        val sweep = 360f * progress
        canvas.drawArc(oval, -90f, sweep, false, arcPaint)
    }
}