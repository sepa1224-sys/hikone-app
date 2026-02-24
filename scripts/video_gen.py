import os
import tempfile
from typing import List, Callable, Optional
from moviepy.editor import (
    AudioFileClip,
    TextClip,
    concatenate_videoclips,
    concatenate_audioclips,
    CompositeVideoClip,
)

def _synthesize_text_audio(text: str, out_path: str, tts_func: Callable[[str, str], None]) -> str:
    tts_func(text, out_path)
    return out_path

def _make_spoken_clip(text: str, duration: float, tts_func: Callable[[str, str], None], size=(1080, 1920)) -> CompositeVideoClip:
    with tempfile.TemporaryDirectory() as tmp:
        audio_path = os.path.join(tmp, "speech.mp3")
        _synthesize_text_audio(text, audio_path, tts_func)
        audio = AudioFileClip(audio_path)
        clip_duration = max(duration, audio.duration)
        card = TextClip(text, fontsize=140, color="white", font="Arial-Bold", size=size, bg_color="black").set_duration(clip_duration)
        return card.set_audio(audio)

def _make_countdown_clip(start: int, tts_func: Callable[[str, str], None], per_step_duration: float = 0.8, size=(1080, 1920)) -> CompositeVideoClip:
    spoken_clips = []
    audio_clips = []
    with tempfile.TemporaryDirectory() as tmp:
        for n in range(start, 0, -1):
            text = str(n)
            audio_path = os.path.join(tmp, f"{n}.mp3")
            _synthesize_text_audio(text, audio_path, tts_func)
            audio = AudioFileClip(audio_path)
            audio_clips.append(audio)
            clip_duration = max(per_step_duration, audio.duration)
            card = TextClip(text, fontsize=180, color="white", font="Arial-Bold", size=size, bg_color="black").set_duration(clip_duration)
            spoken_clips.append(card)
        countdown_video = concatenate_videoclips(spoken_clips, method="compose")
        countdown_audio = concatenate_audioclips(audio_clips)
        return countdown_video.set_audio(countdown_audio)

def generate_word_audio_video(
    words: List[str],
    output_path: str,
    tts_func: Callable[[str, str], None],
    per_word_duration: float = 2.0,
    countdown_from: int = 5,
    outro_text: Optional[str] = None,
    size=(1080, 1920),
) -> str:
    if not words or not isinstance(words, list):
        raise ValueError("words must be a non-empty list")
    if tts_func is None:
        raise ValueError("tts_func must be provided")
    clips = []
    countdown = _make_countdown_clip(countdown_from, tts_func, size=size)
    clips.append(countdown)
    for w in words:
        clips.append(_make_spoken_clip(w, per_word_duration, tts_func, size=size))
    if outro_text:
        clips.append(_make_spoken_clip(outro_text, 2.0, tts_func, size=size))
    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(output_path, fps=30, audio_codec="aac", codec="libx264", threads=4)
    return output_path
