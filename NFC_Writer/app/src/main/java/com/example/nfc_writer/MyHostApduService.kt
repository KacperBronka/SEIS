package com.example.nfc_writer

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

class MyHostApduService : HostApduService() {

    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {

        val message = MainActivity.messageToSend

        return message.toByteArray(Charsets.UTF_8)
    }

    override fun onDeactivated(reason: Int) {}
}