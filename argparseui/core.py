from flask import Flask, request, render_template
import logging
import subprocess
from typing import List

import argparse

logger = logging.getLogger(__name__)


class App:
    def __init__(self, parser) -> None:
        self.app = Flask(__name__)
        self.command_to_run = ["python3", "script.py"]
        self.ui_config = {
            "input_row_max_width": "500px",
        }

        # Define the arguments that script.py's argparse parser will accept.
        # This structure will be used to dynamically generate input fields.
        self.parser = parser
        self.arg_type_map = {
            argparse._StoreAction: "text",
            argparse._StoreTrueAction: "checkbox",
        }

    @property
    def script_arguments(self) -> List:
        return [
            {
                "name": ", ".join(a.option_strings),
                "dest": a.dest,
                "label": a.help,
                "type": self.arg_type_map.get(type(a)),
                "options": a.choices,
                "placeholder": ""
                if a.default is None
                else "e.g., " + f"{a.default}",
                "default": a.default,
            }
            for a in self.parser._actions
            if not isinstance(a, argparse._HelpAction)
        ]

    def run_command(self):
        output = None
        error = None
        final_command_args = list(
            self.command_to_run
        )  # Start with 'python script.py'

        try:
            for arg_def in self.script_arguments:
                arg_dest = arg_def["dest"]
                arg_type = arg_def["type"]
                form_value = request.form.get(arg_dest)
                if form_value == "" or form_value is None:
                    continue
                final_command_args.append("--" + arg_dest)
                if arg_type == "text":
                    final_command_args.append(form_value)

            logger.error(final_command_args)
            result = subprocess.run(
                final_command_args, capture_output=True, text=True, check=False
            )

            if result.stdout:
                output = result.stdout.strip()
            if result.stderr:
                error = result.stderr.strip()

            if result.returncode != 0 and not error:
                error = f"Command failed with exit code {result.returncode}"

        except Exception as e:
            error = f"An unexpected error occurred: {e}"

        return render_template(
            "index.html",
            command=self.command_to_run,
            script_arguments=self.script_arguments,
            ui=self.ui_config,
            output=output,
            error=error,
        )

    def index(self):
        return render_template(
            "index.html",
            command=self.command_to_run,
            script_arguments=self.script_arguments,
            ui=self.ui_config,
            output=None,
            error=None,
        )

    def register(self):
        self.app.route("/run", methods=["POST"])(self.run_command)
        self.app.route("/")(self.index)

    def run(self, *args, **kwargs):
        self.register()
        self.app.run(*args, **kwargs)
