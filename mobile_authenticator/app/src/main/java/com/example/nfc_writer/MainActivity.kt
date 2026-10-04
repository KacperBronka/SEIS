package com.example.nfc_writer

import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    companion object {
        var messageToSend: String = "Domyslna wiadomosc"
    }

    private val SERVER_BASE = "https://seis.chickenkiller.com:443"
    private val SOCKET_URL = SERVER_BASE

    val userData = JSONObject()
    var u_code = ""
    private lateinit var socket: Socket

    private val TIMER_DURATION_MS = 5 * 60 * 1000L
    private var countDownTimer: CountDownTimer? = null

    private lateinit var digitViews: List<TextView>
    private lateinit var timerText: TextView
    private lateinit var timerRing: TimerRingView
    private lateinit var acceptBtn: Button
    private lateinit var declineBtn: Button
    private lateinit var codeBtn: Button
    private lateinit var cardAccept: CardView
    private lateinit var statusDot: View
    private lateinit var statusText: TextView
    private lateinit var txtUserId: TextView
    private lateinit var txtUserName: TextView
    private lateinit var txtInitials: TextView
    private lateinit var txtRequestMeta: TextView

    fun connectSocket(onConnected: () -> Unit, onError: (String) -> Unit) {
        try {
            val options = IO.Options.builder()
                .setTransports(arrayOf("websocket"))
                .build()

            socket = IO.socket(SOCKET_URL, options)

            socket.on(Socket.EVENT_CONNECT) {
                socket.emit("register", userData.getString("id_uid"))
                runOnUiThread { setOnlineStatus(true) }
            }

            socket.on("register_response") {
                onConnected()
            }

            socket.on("renew-code") { args ->
                u_code = args.getOrNull(0).toString()
                runOnUiThread {
                    setDigits(u_code)
                    resetTimer()
                }
            }

            socket.on("accept-request") { args ->
                val meta = args.getOrNull(0).toString()
                runOnUiThread { showAcceptRequest(meta) }
            }

            socket.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val err = args.getOrNull(0)
                android.util.Log.e("SOCKET", "Connect error: $err")
                runOnUiThread { setOnlineStatus(false) }
            }

            socket.on(Socket.EVENT_DISCONNECT) {
                runOnUiThread { setOnlineStatus(false) }
            }

            socket.connect()

        } catch (e: Exception) {
            e.printStackTrace()
            onError(e.toString())
        }
    }

    fun fetchUserData(idUid: String) {
        Thread {
            try {
                val url = java.net.URL("$SERVER_BASE/users/get-user-data")
                val connection = url.openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val body = JSONObject().put("id_uid", idUid).toString().toByteArray()
                connection.outputStream.use { it.write(body) }

                val text = connection.inputStream.bufferedReader().readText()
                val json = JSONObject(text)
                val error = json.optString("error", "")

                if (error.isNullOrEmpty() || error == "null") {
                    val user = json.getJSONObject("user")
                    val fetchedId      = user.getString("gov_id")
                    val fetchedName    = user.getString("name")
                    val fetchedSurname = user.getString("surname")

                    userData.put("id_uid", fetchedId)
                    userData.put("first_name", fetchedName)
                    userData.put("last_name", fetchedSurname)

                    runOnUiThread {
                        txtUserId.text   = "ID: $fetchedId"
                        txtUserName.text = "$fetchedName $fetchedSurname"
                        txtInitials.text = "${fetchedName[0]}${fetchedSurname[0]}"
                    }
                } else {
                    runOnUiThread { txtUserId.text = "Error: $error" }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread { txtUserId.text = "Request failed" }
            }
        }.start()
    }

    fun genCode(callback: (String) -> Unit) {
        Thread {
            try {
                val url = java.net.URL("$SERVER_BASE/users/code")
                val connection = url.openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val body = JSONObject()
                    .put("id_uid", userData.getString("id_uid"))
                    .toString()
                    .toByteArray()

                connection.outputStream.use { it.write(body) }

                val text = connection.inputStream.bufferedReader().readText()
                callback(JSONObject(text).getInt("code").toString())
            } catch (e: Exception) {
                e.printStackTrace()
                callback(e.toString())
            }
        }.start()
    }

    private fun startTimer() {
        countDownTimer?.cancel()
        countDownTimer = object : CountDownTimer(TIMER_DURATION_MS, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val minutes = millisUntilFinished / 60000
                val seconds = (millisUntilFinished % 60000) / 1000
                timerText.text = String.format("%d:%02d", minutes, seconds)

                val fraction = millisUntilFinished.toFloat() / TIMER_DURATION_MS
                timerRing.setProgress(fraction)
            }

            override fun onFinish() {
                timerText.text = "0:00"
                timerRing.setProgress(0f)
                clearDigits()
                u_code = ""
                codeBtn.isEnabled = true
                setOnlineStatus(false)
            }
        }.start()
    }

    private fun resetTimer() {
        startTimer()
    }

    private fun setDigits(code: String) {
        val padded = code.padStart(6, '0').take(6)
        digitViews.forEachIndexed { i, tv ->
            tv.text = padded[i].toString()
            tv.animate().alpha(0f).setDuration(80).withEndAction {
                tv.text = padded[i].toString()
                tv.animate().alpha(1f).setDuration(120).start()
            }.start()
        }
    }

    private fun clearDigits() {
        digitViews.forEach { it.text = "—" }
    }

    private fun setOnlineStatus(online: Boolean) {
        statusDot.setBackgroundResource(
            if (online) R.drawable.bg_dot_online else R.drawable.bg_dot_offline
        )
        statusText.text = if (online) "Connected" else "Offline"
    }

    private fun showAcceptRequest(meta: String) {
        txtRequestMeta.text = "From: $meta"
        cardAccept.visibility = View.VISIBLE
        cardAccept.alpha = 0f
        cardAccept.animate().alpha(1f).setDuration(300).start()
    }


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        userData.put("first_name", "Jan")
        userData.put("last_name", "Kowalski")
        userData.put("PESEL", "02213013293")
        userData.put("id_uid", "ZZC108201")

        val editText  = findViewById<EditText>(R.id.editTextMessage)
        val buttonSet = findViewById<Button>(R.id.buttonSet)

        digitViews = listOf(
            findViewById(R.id.digit1), findViewById(R.id.digit2),
            findViewById(R.id.digit3), findViewById(R.id.digit4),
            findViewById(R.id.digit5), findViewById(R.id.digit6)
        )

        timerText      = findViewById(R.id.txtTimer)
        timerRing      = findViewById(R.id.timerRing)
        codeBtn        = findViewById(R.id.btnCodeGen)
        acceptBtn      = findViewById(R.id.btnAccept)
        cardAccept     = findViewById(R.id.cardAccept)
        declineBtn     = findViewById(R.id.btnDecline)
        statusDot      = findViewById(R.id.statusDot)
        statusText     = findViewById(R.id.statusText)
        txtUserId      = findViewById(R.id.txtUserId)
        txtRequestMeta = findViewById(R.id.txtRequestMeta)
        txtUserName    = findViewById(R.id.txtUserName)
        txtInitials    = findViewById(R.id.txtInitials)

        cardAccept.visibility = View.GONE
        timerRing.setProgress(1f)

        buttonSet.setOnClickListener {
            val newId = editText.text.toString().trim()
            if (newId.isNotEmpty()) {
                fetchUserData(newId)
            }
        }

        codeBtn.setOnClickListener {
            clearDigits()
            codeBtn.isEnabled = false

            connectSocket(
                onConnected = {
                    genCode { code ->
                        u_code = code
                        messageToSend = code
                        runOnUiThread {
                            setDigits(u_code)
                            startTimer()
                        }
                    }
                },
                onError = {
                    runOnUiThread {
                        clearDigits()
                        codeBtn.isEnabled = true
                    }
                }
            )
        }

        acceptBtn.setOnClickListener {
            socket.emit("accept-ok", u_code)
            cardAccept.animate().alpha(0f).setDuration(250).withEndAction {
                cardAccept.visibility = View.GONE
            }.start()
        }

        declineBtn.setOnClickListener {
            socket.emit("accept-decline", u_code)

            cardAccept.animate().alpha(0f).setDuration(250).withEndAction {
                cardAccept.visibility = View.GONE
            }.start()
        }

        findViewById<Button>(R.id.btnFamily).setOnClickListener {
            val intent = Intent(this, FamilyActivity::class.java)
            intent.putExtra("user_id", userData.optString("id_uid", ""))
            intent.putExtra(
                "user_name",
                "${userData.optString("first_name")} ${userData.optString("last_name")}"
            )
            startActivity(intent)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        countDownTimer?.cancel()
        if (::socket.isInitialized) {
            socket.disconnect()
            socket.off()
        }
    }
}
