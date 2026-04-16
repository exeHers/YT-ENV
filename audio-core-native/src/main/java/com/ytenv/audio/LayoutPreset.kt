package com.ytenv.audio

data class LayoutPreset(
    val id: String,
    val widgets: List<Widget>
) {
    data class Widget(
        val id: String,
        val type: String,
        val x: Int,
        val y: Int,
        val width: Int,
        val height: Int,
        val visible: Boolean,
        val zIndex: Int
    )
}
