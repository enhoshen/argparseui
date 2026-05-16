import argparse


def create_parser():
    parser = argparse.ArgumentParser(
        description="Download Instagram images/videos."
    )

    parser.add_argument(
        "--string",
        default=None,
        help="String argument",
    )
    parser.add_argument(
        "--flag",
        default=None,
        action="store_true",
        help="Store true argument",
    )
    parser.add_argument(
        "--select",
        default="INFO",
        choices=[
            "A",
            "B",
            "C",
        ],
        help="Set the logging level",
    )
    return parser


if __name__ == "__main__":
    parser = create_parser()
    args = parser.parse_args()
    print(args)
