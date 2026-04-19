package com.example.nfc_writer

import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class FamilyActivity : AppCompatActivity() {

    private val SERVER_BASE = "http://130.61.44.50:2000"

    private lateinit var layoutNoFamily: LinearLayout
    private lateinit var layoutHasFamily: LinearLayout
    private lateinit var layoutJoinFamily: LinearLayout

    private lateinit var btnCreateFamily: Button
    private lateinit var btnGoJoin: Button

    private lateinit var cardCreateForm: CardView
    private lateinit var editFamilyName: EditText
    private lateinit var editParentEmail: EditText
    private lateinit var btnSubmitCreate: Button
    private lateinit var btnCancelCreate: Button

    private lateinit var editJoinCode: EditText
    private lateinit var btnSubmitJoin: Button
    private lateinit var btnCancelJoin: Button

    private lateinit var txtFamilyName: TextView
    private lateinit var txtFamilyRole: TextView
    private lateinit var txtFamilyCode: TextView
    private lateinit var txtFamilyShareInfo: TextView
    private lateinit var txtFamilyJoinInfo : TextView
    private lateinit var memberListContainer: LinearLayout
    private lateinit var cardPendingRequests: CardView
    private lateinit var pendingContainer: LinearLayout

    // ── Debug panel ────────────────────────────────────────────────────────────
    private lateinit var debugPanel: CardView
    private lateinit var debugLog: TextView
    private lateinit var debugScroll: ScrollView
    private val debugLines = StringBuilder()
    private val sdf = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

    private var currentUserId: String = ""
    private var currentUserName: String = ""
    private var currentFamilyId: String = ""
    private var isParent: Boolean = false

    // ══════════════════════════════════════════════════════════════════════════
    // Central HTTP helper — logs every request and response
    // ══════════════════════════════════════════════════════════════════════════

    private fun httpPost(path: String, body: JSONObject): Result<String> {
        val fullUrl = "$SERVER_BASE$path"
        val bodyStr = body.toString()

        debugAppend("▶ POST $fullUrl")
        debugAppend("  Body: $bodyStr")

        return try {
            val url  = java.net.URL(fullUrl)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout    = 8000
            conn.requestMethod  = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.use { it.write(bodyStr.toByteArray()) }

            val httpCode = conn.responseCode
            val stream   = if (httpCode in 200..299) conn.inputStream else conn.errorStream
            val response = stream?.bufferedReader()?.readText() ?: "(empty body)"

            debugAppend("  ← HTTP $httpCode")
            debugAppend("  Response: $response")
            debugAppend("─────────────────────────────")

            if (httpCode in 200..299) Result.success(response)
            else Result.failure(Exception("HTTP $httpCode: $response"))

        } catch (e: Exception) {
            val msg = "${e.javaClass.simpleName}: ${e.message}"
            debugAppend("  ✕ EXCEPTION: $msg")
            debugAppend("─────────────────────────────")
            // Show a toast for connection errors so it's immediately visible
            runOnUiThread {
                Toast.makeText(this, "Network error: $msg", Toast.LENGTH_LONG).show()
            }
            Result.failure(e)
        }
    }

    private fun debugAppend(line: String) {
        val entry = "[${sdf.format(Date())}] $line\n"
        android.util.Log.d("SEIS_DEBUG", line)
        runOnUiThread {
            debugLines.append(entry)
            debugLog.text = debugLines.toString()
            debugScroll.post { debugScroll.fullScroll(View.FOCUS_DOWN) }
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ══════════════════════════════════════════════════════════════════════════

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_family)

        currentUserId   = intent.getStringExtra("user_id")   ?: ""
        currentUserName = intent.getStringExtra("user_name") ?: ""

        bindViews()
        setupListeners()

        debugAppend("=== FamilyActivity started ===")
        debugAppend("user_id  = $currentUserId")
        debugAppend("server   = $SERVER_BASE")
        debugAppend("─────────────────────────────")

        loadFamilyStatus()
    }

    // ══════════════════════════════════════════════════════════════════════════
    // View binding
    // ══════════════════════════════════════════════════════════════════════════

    private fun bindViews() {
        layoutNoFamily      = findViewById(R.id.layoutNoFamily)
        layoutHasFamily     = findViewById(R.id.layoutHasFamily)
        layoutJoinFamily    = findViewById(R.id.layoutJoinFamily)

        btnCreateFamily     = findViewById(R.id.btnCreateFamily)
        btnGoJoin           = findViewById(R.id.btnGoJoin)

        cardCreateForm      = findViewById(R.id.cardCreateForm)
        editFamilyName      = findViewById(R.id.editFamilyName)
        editParentEmail     = findViewById(R.id.editParentEmail)
        btnSubmitCreate     = findViewById(R.id.btnSubmitCreate)
        btnCancelCreate     = findViewById(R.id.btnCancelCreate)

        editJoinCode        = findViewById(R.id.editJoinCode)
        btnSubmitJoin       = findViewById(R.id.btnSubmitJoin)
        btnCancelJoin       = findViewById(R.id.btnCancelJoin)

        txtFamilyName       = findViewById(R.id.txtFamilyName)
        txtFamilyRole       = findViewById(R.id.txtFamilyRole)
        txtFamilyCode       = findViewById(R.id.txtFamilyCode)
        txtFamilyShareInfo  = findViewById(R.id.txtFamilyShareInfo)
        txtFamilyJoinInfo   = findViewById(R.id.txtFamilyJoinInfo )
        memberListContainer = findViewById(R.id.memberListContainer)
        cardPendingRequests = findViewById(R.id.cardPendingRequests)
        pendingContainer    = findViewById(R.id.pendingContainer)

        debugPanel  = findViewById(R.id.debugPanel)
        debugLog    = findViewById(R.id.debugLog)
        debugScroll = findViewById(R.id.debugScroll)

        cardCreateForm.visibility      = View.GONE
        layoutJoinFamily.visibility    = View.GONE
        cardPendingRequests.visibility = View.GONE
        debugPanel.visibility          = View.GONE  // tap 🐛 to show
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Listeners
    // ══════════════════════════════════════════════════════════════════════════

    private fun setupListeners() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }

        // Debug toggle
        findViewById<Button>(R.id.btnDebugToggle).setOnClickListener {
            debugPanel.visibility =
                if (debugPanel.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }
        // Clear log
        findViewById<Button>(R.id.btnDebugClear).setOnClickListener {
            debugLines.clear()
            debugLog.text = "(cleared)"
        }
        // Copy log to clipboard
        findViewById<Button>(R.id.btnDebugCopy).setOnClickListener {
            val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
            clipboard.setPrimaryClip(
                android.content.ClipData.newPlainText("SEIS Debug Log", debugLines.toString())
            )
            Toast.makeText(this, "Log copied to clipboard", Toast.LENGTH_SHORT).show()
        }

        btnCreateFamily.setOnClickListener {
            layoutNoFamily.visibility = View.GONE
            cardCreateForm.visibility = View.VISIBLE
        }
        btnCancelCreate.setOnClickListener {
            cardCreateForm.visibility = View.GONE
            layoutNoFamily.visibility = View.VISIBLE
        }
        btnGoJoin.setOnClickListener {
            layoutNoFamily.visibility   = View.GONE
            layoutJoinFamily.visibility = View.VISIBLE
        }
        btnCancelJoin.setOnClickListener {
            layoutJoinFamily.visibility = View.GONE
            layoutNoFamily.visibility   = View.VISIBLE
        }

        btnSubmitCreate.setOnClickListener { submitCreateFamily() }
        btnSubmitJoin.setOnClickListener   { submitJoinFamily()   }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // API calls
    // ══════════════════════════════════════════════════════════════════════════

    private fun loadFamilyStatus() {
        Thread {
            val result = httpPost("/family/status", JSONObject().put("id_uid", currentUserId))
            runOnUiThread {
                result.fold(
                    onSuccess = { text ->
                        try {
                            val json = JSONObject(text)
                            if (json.optBoolean("in_family", false)) {
                                currentFamilyId = json.optString("family_id", "")
                                isParent        = json.optString("role", "child") == "parent"
                                showFamilyView(json)
                            } else {
                                showNoFamilyView()
                            }
                        } catch (e: Exception) {
                            debugAppend("  ✕ Parse error: ${e.message}")
                            showNoFamilyView()
                        }
                    },
                    onFailure = { showNoFamilyView() }
                )
            }
        }.start()
    }

    private fun submitCreateFamily() {
        val name  = editFamilyName.text.toString().trim()
        val email = editParentEmail.text.toString().trim()
        if (name.isEmpty() || email.isEmpty()) {
            Toast.makeText(this, "Fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }
        btnSubmitCreate.isEnabled = false

        Thread {
            val result = httpPost("/family/create", JSONObject()
                .put("id_uid",      currentUserId)
                .put("family_name", name)
                .put("email",       email))
            runOnUiThread {
                btnSubmitCreate.isEnabled = true
                result.fold(
                    onSuccess = { text ->
                        try {
                            val json = JSONObject(text)
                            val err  = json.optString("error", "")
                            if (err.isEmpty() || err == "null") {
                                currentFamilyId           = json.optString("family_id", "")
                                isParent                  = true
                                cardCreateForm.visibility = View.GONE
                                showFamilyView(json)
                            } else {
                                Toast.makeText(this, err, Toast.LENGTH_LONG).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(this, "Parse error: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    },
                    onFailure = { e ->
                        Toast.makeText(this, "Failed: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                )
            }
        }.start()
    }

    private fun submitJoinFamily() {
        val code = editJoinCode.text.toString().trim()
        if (code.isEmpty()) {
            Toast.makeText(this, "Enter a family code", Toast.LENGTH_SHORT).show()
            return
        }
        btnSubmitJoin.isEnabled = false

        Thread {
            val result = httpPost("/family/join", JSONObject()
                .put("id_uid",    currentUserId)
                .put("join_code", code))
            runOnUiThread {
                btnSubmitJoin.isEnabled = true
                result.fold(
                    onSuccess = { text ->
                        try {
                            val json = JSONObject(text)
                            val err  = json.optString("error", "")
                            if (err.isEmpty() || err == "null") {
                                Toast.makeText(this, "Request sent! Waiting for parent approval.", Toast.LENGTH_LONG).show()
                                layoutJoinFamily.visibility = View.GONE
                                layoutNoFamily.visibility   = View.VISIBLE
                            } else {
                                Toast.makeText(this, err, Toast.LENGTH_LONG).show()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(this, "Parse error: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    },
                    onFailure = { e ->
                        Toast.makeText(this, "Failed: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                )
            }
        }.start()
    }

    fun reportActivity(childId: String, serviceName: String) {
        Thread {
            httpPost("/family/activity", JSONObject()
                .put("family_id",  currentFamilyId)
                .put("child_id",   childId)
                .put("service",    serviceName)
                .put("timestamp",  System.currentTimeMillis()))
        }.start()
    }

    private fun respondToRequest(childId: String, approve: Boolean, rowView: View) {
        val endpoint = if (approve) "/family/approve" else "/family/decline"
        Thread {
            val result = httpPost(endpoint, JSONObject()
                .put("parent_id", currentUserId)
                .put("child_id",  childId)
                .put("family_id", currentFamilyId))
            runOnUiThread {
                result.fold(
                    onSuccess = {
                        (rowView.parent as? LinearLayout)?.removeView(rowView)
                        Toast.makeText(this, if (approve) "Member approved!" else "Request declined.", Toast.LENGTH_SHORT).show()
                    },
                    onFailure = { e ->
                        Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }.start()
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UI state helpers
    // ══════════════════════════════════════════════════════════════════════════

    private fun showNoFamilyView() {
        layoutNoFamily.visibility   = View.VISIBLE
        layoutHasFamily.visibility  = View.GONE
        layoutJoinFamily.visibility = View.GONE
        cardCreateForm.visibility   = View.GONE
    }
    private fun removeMember(childId: String, rowView: View) {
        Thread {
            val result = httpPost("/family/remove", JSONObject()
                .put("parent_id", currentUserId)
                .put("child_id", childId))

            runOnUiThread {
                result.fold(
                    onSuccess = {
                        (rowView.parent as? LinearLayout)?.removeView(rowView)
                        Toast.makeText(this, "Member removed", Toast.LENGTH_SHORT).show()
                    },
                    onFailure = { e ->
                        Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                )
            }
        }.start()
    }
    private fun showFamilyView(json: JSONObject) {
        layoutNoFamily.visibility  = View.GONE
        layoutHasFamily.visibility = View.VISIBLE

        txtFamilyName.text = json.optString("family_name", "My Family")
        txtFamilyRole.text = if (isParent) "Parent · Admin" else "Child · Member"
        val joinCode = json.optString("join_code", "——")

        if (isParent) {
            txtFamilyCode.visibility = View.VISIBLE
            txtFamilyJoinInfo.visibility = View.VISIBLE
            txtFamilyShareInfo.visibility = View.VISIBLE
            txtFamilyCode.text = joinCode
        } else {
            txtFamilyCode.visibility = View.GONE
            txtFamilyJoinInfo.visibility = View.GONE
            txtFamilyShareInfo.visibility = View.GONE
        }

        memberListContainer.removeAllViews()
        val members = json.optJSONArray("members") ?: JSONArray()
        for (i in 0 until members.length()) {
            val m   = members.getJSONObject(i)
            val row = layoutInflater.inflate(R.layout.item_family_member, memberListContainer, false)
            val name = m.optString("name", "—")
            val role = m.optString("role", "child")

            row.findViewById<TextView>(R.id.memberName).text = name
            row.findViewById<TextView>(R.id.memberRole).text = role
            row.findViewById<TextView>(R.id.memberInitials).text = name.take(2).uppercase()

            val badge = row.findViewById<TextView>(R.id.memberRoleBadge)
            if (role == "parent") {
                badge.visibility = View.VISIBLE
                badge.text = "👑"
            } else {
                badge.visibility = View.GONE
            }
            val memberId = m.optString("id_uid", "")
            val removeBtn = row.findViewById<Button>(R.id.btnRemove)

            // Only parent can remove, and never remove themselves
            if (isParent && role != "parent") {
                removeBtn.visibility = View.VISIBLE

                removeBtn.setOnClickListener {
                    AlertDialog.Builder(this)
                        .setTitle("Remove member")
                        .setMessage("Are you sure you want to remove this child?")
                        .setPositiveButton("Yes") { _, _ ->
                            removeMember(memberId, row)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                }
            } else {
                removeBtn.visibility = View.GONE
            }
            memberListContainer.addView(row)
        }

        val pending = json.optJSONArray("pending_requests") ?: JSONArray()
        if (isParent && pending.length() > 0) {
            cardPendingRequests.visibility = View.VISIBLE
            pendingContainer.removeAllViews()
            for (i in 0 until pending.length()) {
                val req = pending.getJSONObject(i)
                val row = layoutInflater.inflate(R.layout.item_pending_request, pendingContainer, false)
                row.findViewById<TextView>(R.id.pendingName).text =
                    req.optString("name", req.optString("id_uid", "Unknown"))
                row.findViewById<Button>(R.id.btnApprove).setOnClickListener {
                    respondToRequest(req.optString("id_uid"), true, row)
                }
                row.findViewById<Button>(R.id.btnDecline).setOnClickListener {
                    respondToRequest(req.optString("id_uid"), false, row)
                }
                pendingContainer.addView(row)
            }
        } else {
            cardPendingRequests.visibility = View.GONE
        }
    }
}