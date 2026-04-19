package com.example.nfc_reader

import android.nfc.*
import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import android.nfc.tech.IsoDep
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity(), NfcAdapter.ReaderCallback {

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var textView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        textView = findViewById(R.id.textViewMessage)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
    }

    override fun onResume() {
        super.onResume()
        nfcAdapter?.enableReaderMode(
            this,
            this,
            NfcAdapter.FLAG_READER_NFC_A,
            null
        )
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableReaderMode(this)
    }

    override fun onTagDiscovered(tag: Tag) {
        val isoDep = IsoDep.get(tag) ?: return
        var message: String? = null


        try {
            isoDep.connect()

            val selectCommand = byteArrayOf(
                0x00, 0xA4.toByte(), 0x04, 0x00, 0x07,
                0xF0.toByte(), 0x01, 0x02, 0x03, 0x04, 0x05, 0x06
            )

            val response = isoDep.transceive(selectCommand)
            message = String(response, Charsets.UTF_8)

        } catch (e: Exception) {
            e.printStackTrace()
            runOnUiThread { textView.text = "NFC Error: ${e.message}" }
        } finally {
            try { isoDep.close() } catch (_: Exception) {}
        }


        message?.let { msg ->
            runOnUiThread { textView.text = msg }


            val verifyAgeResponse = httpPost(
                "http://130.61.44.50:2000/users/verify-age",
                """{"meta":"Biedronka","code":${escapeJson(msg)},"requested_age":"18"}"""
            )


            if (verifyAgeResponse != null) {
                httpPost(
                    "http://10.27.114.73:5001/receive/",
                    verifyAgeResponse
                )
            }
        }
    }

    private fun escapeJson(value: String): String {
        return "\"" + value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t") + "\""
    }

    private fun httpPost(baseUrl: String, jsonBody: String): String? {
        return try {
            val url = URL(baseUrl)
            val connection = url.openConnection() as HttpURLConnection
            val body = jsonBody.toByteArray(Charsets.UTF_8)

            Log.d("HTTP_POST", "URL: $baseUrl")
            Log.d("HTTP_POST", "Body: $jsonBody")

            connection.requestMethod = "POST"
            connection.connectTimeout = 15000
            connection.readTimeout = 15000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")

            connection.outputStream.use { it.write(body) }

            val responseCode = connection.responseCode
            Log.d("HTTP_POST", "Response code: $responseCode")

            val responseBody = try {
                connection.inputStream.bufferedReader().use { it.readText() }
            } catch (e: Exception) {
                connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "no error body"
            }

            Log.d("HTTP_POST", "Response body: $responseBody")

            if (responseCode == HttpURLConnection.HTTP_OK) responseBody else null

        } catch (e: Exception) {
            Log.e("HTTP_POST", "Exception: ${e::class.simpleName}: ${e.message}")
            e.printStackTrace()
            null
        }
    }
}