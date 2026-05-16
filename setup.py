from setuptools import setup, find_packages

setup(
    name="argparseui",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "Flask>=2.0.0",
    ],
    description="A Python library to host web UI given argparse parser.",
    # author="Your Name",  # Replace with actual author name
    # author_email="your.email@example.com",  # Replace with actual email
    # url="https://github.com/yourusername/argparse-ui",  # Replace with actual URL
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",  # Example license
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",  # Specify minimum Python version
    package_data={
        "argparseui": [
            "templates/*",
            "static/css/*",
            "static/js/*",
        ],
    },
    include_package_data=True,
)
