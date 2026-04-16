cmake_minimum_required(VERSION 3.22.1)
project(ytenv_audio)

add_library(
        ytenv_audio
        SHARED
        ytenv_audio_jni.cpp
        dsp_rack.cpp
)

find_library(log-lib log)

target_include_directories(
        ytenv_audio
        PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
)

target_link_libraries(
        ytenv_audio
        ${log-lib}
)
